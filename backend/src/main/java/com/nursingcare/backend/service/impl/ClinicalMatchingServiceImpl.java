package com.nursingcare.backend.service.impl;

import com.nursingcare.backend.entity.HealthProfile;
import com.nursingcare.backend.service.ClinicalMatchingService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class ClinicalMatchingServiceImpl implements ClinicalMatchingService {
    private static final List<String> RN_EQUIPMENT = List.of(
            "เครื่องช่วยหายใจ", "ventilator", "bipap", "ท่อเจาะคอ", "tracheostomy",
            "สายให้อาหาร", "tube", "สายสวนปัสสาวะ", "catheter", "ล้างไต", "capd"
    );

    private static final List<String> RN_COMPLAINTS = List.of(
            "tube_feeding", "urinary_catheter", "suction_needed", "ventilator_user",
            "wound_care", "oncology_care", "choking_risk", "delirium", "oxygen_dependent",
            "insulin_injection", "drainage_care", "ostomy_care", "แผลเรื้อรัง", "แผลกดทับ",
            "แผลผ่าตัด", "สายยาง", "สายสวน", "ดูดเสมหะ", "มะเร็ง", "กลืนลำบาก", "สำลัก",
            "เพ้อ", "ออกซิเจน", "อินซูลิน", "สายระบาย", "ทวารเทียม"
    );

    private static final List<String> RN_CUSTOM_KEYWORDS = List.of(
            "แผล", "เย็บ", "ตัดไหม", "ล้างแผล", "สาย", "ท่อ", "เจาะคอ", "ดูดเสมหะ", "พ่นยา",
            "ออกซิเจน", "อินซูลิน", "ฉีดยา", "เจาะเลือด", "น้ำเกลือ", "สารน้ำ", "ล้างไต",
            "ทวารเทียม", "wound", "catheter", "suction", "insulin", "injection", "oxygen"
    );

    private static final List<String> PN_COMPLAINTS = List.of(
            "rehab_need", "stroke_care", "medication_management", "hospital_escort",
            "กายภาพ", "พยุงเดิน", "หลอดเลือดสมอง", "stroke", "จัดยา"
    );

    private static final List<String> PN_CUSTOM_KEYWORDS = List.of(
            "กายภาพ", "พยุงเดิน", "อ่อนแรง", "อัมพฤกษ์", "จัดยา", "ฝึกเดิน", "rehab"
    );

    @Override
    public Map<String, Object> assessHealthProfile(HealthProfile healthProfile) {
        String assistance = lower(healthProfile == null ? null : healthProfile.getCurrentAssistance());
        String complaint = lower(healthProfile == null ? null : healthProfile.getChiefComplaint());
        String consciousness = lower(healthProfile == null ? null : healthProfile.getConsciousness());
        String adlScore = lower(healthProfile == null ? null : healthProfile.getAdlScore());

        String customText = complaint.contains("other:")
                ? complaint.substring(complaint.indexOf("other:") + 6)
                : "";
        boolean hasRnEquipment = containsAny(assistance, RN_EQUIPMENT);
        boolean hasRnComplaint = containsAny(complaint, RN_COMPLAINTS)
                || containsAny(customText, RN_CUSTOM_KEYWORDS);
        boolean severeConsciousness = containsAny(consciousness,
                List.of("ไม่รู้สึกตัว", "unconscious", "ซึม", "drowsy"));

        String tier;
        String reason;
        if (hasRnEquipment || hasRnComplaint || severeConsciousness) {
            tier = "RN";
            reason = "มีสายอุปกรณ์ทางการแพทย์ อาการสำคัญ หรือระดับความรู้สึกตัวที่ต้องใช้พยาบาลวิชาชีพ";
        } else {
            boolean pnCase = containsAny(complaint, PN_COMPLAINTS)
                    || containsAny(customText, PN_CUSTOM_KEYWORDS)
                    || adlScore.contains("ช่วยเหลือบางส่วน");
            if (pnCase) {
                tier = "PN";
                reason = "ต้องการการฟื้นฟู พยุงเดิน หรือบริหารยา";
            } else {
                tier = "CG";
                reason = "ดูแลกิจวัตรประจำวันและเฝ้าระวังทั่วไป";
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("tier", tier);
        result.put("reason", reason);
        result.put("source", "backend_clinical_rules_v1");
        result.put("required_license", "RN".equals(tier));
        return result;
    }

    private String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    private boolean containsAny(String value, List<String> keywords) {
        return keywords.stream().anyMatch(value::contains);
    }
}
