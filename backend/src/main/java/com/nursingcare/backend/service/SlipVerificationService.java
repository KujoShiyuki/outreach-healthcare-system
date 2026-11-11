package com.nursingcare.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;

@Service
public class SlipVerificationService {

    @Value("${slip.verify.url:https://slip.xepht.com/api/v1/slips/verify}")
    private String verifyUrl;

    @Value("${slip.receiver.account:}")
    private String receiverAccount;

    @Value("${slip.receiver.name:}")
    private String receiverName;

    private final RestTemplate restTemplate;

    public SlipVerificationService() {
        this.restTemplate = new RestTemplate();
        // ป้องกัน RestTemplate โยน exception เมื่อ API ตอบ 4xx หรือ 5xx เพื่อให้อ่าน body ผลลัพธ์ได้
        this.restTemplate.setErrorHandler(new ResponseErrorHandler() {
            @Override
            public boolean hasError(ClientHttpResponse response) throws IOException {
                return false;
            }

            @Override
            public void handleError(ClientHttpResponse response) throws IOException {
            }
        });
    }

    public static class VerifyResult {
        private final String transRef;
        private final Double amount;

        public VerifyResult(String transRef, Double amount) {
            this.transRef = transRef;
            this.amount = amount;
        }

        public String getTransRef() {
            return transRef;
        }

        public Double getAmount() {
            return amount;
        }
    }

    /**
     * ตรวจสอบสลิปโอนเงินผ่าน Slip Verification API
     *
     * @param slipFile ไฟล์รูปสลิปจากผู้ใช้งาน
     * @param expectedAmount ยอดเงินที่ต้องชำระตามระบบ
     * @return VerifyResult ผลลัพธ์เลข transRef และยอดเงิน
     */
    public VerifyResult verifySlip(MultipartFile slipFile, Double expectedAmount) {
        if (slipFile == null || slipFile.isEmpty()) {
            throw new RuntimeException("กรุณาแนบไฟล์สลิปโอนเงิน");
        }

        try {
            ByteArrayResource fileResource = new ByteArrayResource(slipFile.getBytes()) {
                @Override
                public String getFilename() {
                    return slipFile.getOriginalFilename() != null && !slipFile.getOriginalFilename().isEmpty()
                            ? slipFile.getOriginalFilename()
                            : "slip.jpg";
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", fileResource);

            if (expectedAmount != null && expectedAmount > 0) {
                body.add("amount", String.format(Locale.US, "%.2f", expectedAmount));
            }

            if (receiverAccount != null && !receiverAccount.trim().isEmpty()) {
                body.add("receiver_account", receiverAccount.trim());
            }

            if (receiverName != null && !receiverName.trim().isEmpty()) {
                body.add("receiver_name", receiverName.trim());
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(verifyUrl, requestEntity, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody == null) {
                throw new RuntimeException("ไม่ได้รับการตอบกลับจากระบบตรวจสอบสลิป");
            }

            String code = (String) responseBody.get("code");
            String message = (String) responseBody.get("message");
            System.out.println(">>> [SLIP VERIFY] Response code: " + code + ", message: " + message + ", full: " + responseBody);

            @SuppressWarnings("unchecked")
            Map<String, Object> data = responseBody.get("data") instanceof Map<?, ?> ? (Map<String, Object>) responseBody.get("data") : null;
            String transRef = data != null && data.get("trans_ref") != null ? data.get("trans_ref").toString() : null;
            Double amountInSlip = null;
            if (data != null && data.get("amountInSlip") != null) {
                try {
                    amountInSlip = Double.valueOf(data.get("amountInSlip").toString());
                } catch (NumberFormatException ignored) {}
            }

            boolean hasValidTransRef = transRef != null && !transRef.isBlank();
            boolean isAmountOk = (amountInSlip != null && expectedAmount != null && Math.abs(amountInSlip - expectedAmount) < 0.01)
                    || (data != null && Boolean.TRUE.equals(data.get("is_amount_matched")));

            // ต้องมีเลขอ้างอิงและยอดเงินตรงกันเสมอ แม้ API จะตอบ VERIFIED
            // เพื่อป้องกันการรับสลิปที่ตรวจพบ QR แต่ยอดหรือข้อมูลธุรกรรมไม่ครบถ้วน
            if ("VERIFIED".equalsIgnoreCase(code) && !hasValidTransRef) {
                throw new RuntimeException("ระบบตรวจสอบสลิปไม่พบเลขอ้างอิงรายการ");
            }
            if ("VERIFIED".equalsIgnoreCase(code) && expectedAmount != null && !isAmountOk) {
                throw new RuntimeException("ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ");
            }
            if (hasValidTransRef && isAmountOk) {
                return new VerifyResult(transRef, amountInSlip != null ? amountInSlip : expectedAmount);
            }

            // แปลงรหัสข้อผิดพลาดเป็นข้อความภาษาไทย พร้อมแนบรายละเอียดผู้รับที่อ่านได้จากสลิป
            String extraInfo = "";
            if (responseBody.get("data") instanceof Map<?, ?> dataMap) {
                if (dataMap.get("hint") != null) {
                    extraInfo = " (" + dataMap.get("hint") + ")";
                } else if (dataMap.get("rawSlip") instanceof Map<?, ?> rawSlip && rawSlip.get("receiver") != null) {
                    extraInfo = " (ผู้รับในสลิป: " + rawSlip.get("receiver") + ")";
                }
            }
            throw new RuntimeException(getThaiErrorMessage(code, message) + extraInfo);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("เกิดข้อผิดพลาดในการเชื่อมต่อระบบตรวจสอบสลิป: " + e.getMessage());
        }
    }

    private String getThaiErrorMessage(String code, String defaultMessage) {
        if (code == null) return defaultMessage != null ? defaultMessage : "การตรวจสอบสลิปล้มเหลว";

        return switch (code) {
            case "AMOUNT_MISMATCH" -> "ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ";
            case "AMOUNT_ALTERED" -> "ยอดเงินบนภาพไม่ตรงกับข้อมูลจริงของรายการ";
            case "SLIP_ALREADY_USED", "SLIP_USED_ELSEWHERE" -> "สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้";
            case "WRONG_RECEIVER" -> "เงินเข้าบัญชีอื่น ไม่ใช่บัญชีที่ถูกต้องของระบบ";
            case "SLIP_NOT_FOUND_AT_BANK" -> "ไม่พบรายการโอนนี้ในระบบธนาคาร";
            case "QR_NOT_FOUND" -> "ไม่พบ QR Code บนรูปสลิป กรุณาอัปโหลดภาพสลิปที่คมชัด";
            case "INVALID_QR_PAYLOAD" -> "QR Code บนภาพไม่ใช่สลิปโอนเงินของธนาคาร";
            case "SLIP_UNREADABLE" -> "ภาพสลิปไม่ชัดเจนเพียงพอในการตรวจสอบ";
            case "SCREEN_PHOTO_NOT_ACCEPTED" -> "ระบบไม่รับภาพถ่ายจากหน้าจออื่น กรุณาใช้รูปสลิปจากแอปธนาคาร";
            case "EMBEDDED_SLIP_NOT_ACCEPTED" -> "กรุณาใช้ไฟล์สลิปจากแอปธนาคารโดยตรง (ไม่แคปจากแชทหรือแอปอื่น)";
            case "QR_ONLY_NOT_ACCEPTED" -> "กรุณาแนบภาพสลิปเต็มใบ ไม่แนบเฉพาะ QR Code";
            case "SLIP_EXPIRED" -> "รายการโอนเกิดขึ้นนานเกินกำหนด";
            case "UNSUPPORTED_FILE_TYPE" -> "รองรับเฉพาะไฟล์รูปภาพ JPG หรือ PNG เท่านั้น";
            case "FILE_TOO_LARGE", "IMAGE_TOO_LARGE" -> "ไฟล์รูปภาพมีขนาดใหญ่เกินไป";
            case "VERIFY_UNAVAILABLE" -> "ระบบตรวจสอบสลิปของธนาคารขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
            default -> defaultMessage != null && !defaultMessage.isEmpty()
                    ? defaultMessage
                    : "สลิปไม่ผ่านการตรวจสอบ (รหัส: " + code + ")";
        };
    }
}
