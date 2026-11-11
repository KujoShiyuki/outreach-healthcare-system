package com.nursingcare.backend.service.impl;

import com.nursingcare.backend.entity.WithdrawRequest;
import com.nursingcare.backend.entity.Nurse;
import com.nursingcare.backend.repository.WithdrawRequestRepository;
import com.nursingcare.backend.repository.NurseRepository;
import com.nursingcare.backend.repository.ServiceRequestRepository;
import com.nursingcare.backend.repository.UserRepository;
import com.nursingcare.backend.service.AdminService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminServiceImpl implements AdminService {

    private final NurseRepository nurseRepository;
    private final UserRepository userRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final WithdrawRequestRepository withdrawRequestRepository;
    private final com.nursingcare.backend.repository.AdminRepository adminRepository;

    public AdminServiceImpl(NurseRepository nurseRepository,
                            UserRepository userRepository,
                            ServiceRequestRepository serviceRequestRepository,
                            WithdrawRequestRepository withdrawRequestRepository,
                            com.nursingcare.backend.repository.AdminRepository adminRepository) {
        this.nurseRepository = nurseRepository;
        this.userRepository = userRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.withdrawRequestRepository = withdrawRequestRepository;
        this.adminRepository = adminRepository;
    }

    @Override
    public List<Map<String, Object>> listPendingNurses() {
        return nurseRepository.findAll().stream()
                .filter(n -> "Pending".equalsIgnoreCase(n.getApprovalStatus()))
                .map(n -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", n.getId());
                    map.put("fullname", n.getFullname());
                    map.put("surname", n.getSurname());
                    map.put("professional_tier", n.getProfessionalTier());
                    map.put("license_number", n.getLicenseNumber());
                    map.put("license_issue_date", n.getLicenseIssueDate() != null ? n.getLicenseIssueDate().toString() : "");
                    map.put("license_expire_date", n.getLicenseExpireDate() != null ? n.getLicenseExpireDate().toString() : "");
                    map.put("license_file_url", n.getLicenseFileUrl());
                    map.put("national_id", maskNationalId(n.getNationalId()));
                    map.put("email", n.getUser().getEmail());
                    map.put("birth_date", n.getBirthDate() != null ? n.getBirthDate().toString() : "");
                    map.put("identity_document_url", n.getIdentityDocumentUrl());
                    map.put("criminal_record_url", n.getCriminalRecordUrl());
                    map.put("medical_certificate_url", n.getMedicalCertificateUrl());
                    return map;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void verifyNurseLicense(String id, String decision) {
        Nurse nurse = nurseRepository.findById(id).orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลพยาบาล"));
        if ("Verified".equals(decision) || "Rejected".equals(decision)) {
            nurse.setApprovalStatus(decision);
            nurseRepository.save(nurse);
        } else {
            throw new RuntimeException("คำสั่งไม่ถูกต้อง");
        }
    }

    @Override
    public List<Map<String, Object>> searchNurseAccounts(String query) {
        return nurseRepository.findAll().stream()
                .filter(n -> query == null || query.isEmpty() ||
                        (n.getFullname() != null && n.getFullname().contains(query)) ||
                        (n.getSurname() != null && n.getSurname().contains(query)) ||
                        (n.getLicenseNumber() != null && n.getLicenseNumber().contains(query)) ||
                        (n.getUser() != null && n.getUser().getEmail() != null && n.getUser().getEmail().contains(query)))
                .map(n -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", n.getId());
                    map.put("fullname", n.getFullname());
                    map.put("surname", n.getSurname());
                    map.put("email", n.getUser().getEmail());
                    map.put("approval_status", n.getApprovalStatus());
                    map.put("user_status", n.getUser().getStatus());
                    map.put("professional_tier", n.getProfessionalTier());
                    map.put("license_number", n.getLicenseNumber());
                    map.put("license_issue_date", n.getLicenseIssueDate() != null ? n.getLicenseIssueDate().toString() : "");
                    map.put("license_expire_date", n.getLicenseExpireDate() != null ? n.getLicenseExpireDate().toString() : "");
                    map.put("service_area", n.getServiceArea());
                    map.put("phone", n.getPhoneNumber());
                    map.put("license_file_url", n.getLicenseFileUrl());
                    map.put("identity_document_url", n.getIdentityDocumentUrl());
                    map.put("criminal_record_url", n.getCriminalRecordUrl());
                    map.put("medical_certificate_url", n.getMedicalCertificateUrl());
                    return map;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void suspendNurseAccount(String id, String status) {
        Nurse nurse = nurseRepository.findById(id).orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลพยาบาล"));
        String normalizedStatus = status == null ? "Suspended" : status.trim();
        if (!"Active".equalsIgnoreCase(normalizedStatus) && !"Suspended".equalsIgnoreCase(normalizedStatus)) {
            throw new RuntimeException("สถานะบัญชีไม่ถูกต้อง ต้องเป็น Active หรือ Suspended");
        }

        // ข้อ 7: ถ้ามีงานที่พยาบาลกำลังทำอยู่หรือไม่เสร็จสิ้น ไม่สามารถระงับได้
        if ("Suspended".equalsIgnoreCase(normalizedStatus)) {
            List<String> activeStatuses = java.util.Arrays.asList("Pending", "Accepted", "InProgress");
            List<com.nursingcare.backend.entity.ServiceRequest> activeRequests = serviceRequestRepository.findByNurseIdAndStatusIn(nurse.getId(), activeStatuses);
            if (!activeRequests.isEmpty()) {
                throw new RuntimeException("ไม่สามารถระงับบัญชีพยาบาลได้ เนื่องจากยังมีงานบริการที่ดำเนินการอยู่หรือรอดำเนินการ (" + activeRequests.size() + " รายการ)");
            }
        }

        nurse.getUser().setStatus("Active".equalsIgnoreCase(normalizedStatus) ? "Active" : "Suspended");
        userRepository.save(nurse.getUser());
    }

    @Override
    public List<Map<String, Object>> listAllServiceHistory() {
        return serviceRequestRepository.findAll().stream()
                .map(sr -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", sr.getId());
                    map.put("status", sr.getStatus());
                    map.put("patient_name", sr.getPatient().getFirstname() + " " + sr.getPatient().getLastname());
                    if (sr.getNurse() != null) map.put("nurse_name", sr.getNurse().getFullname() + " " + sr.getNurse().getSurname());
                    map.put("start_date", sr.getStartDate() != null ? sr.getStartDate().toString() : "");
                    map.put("time_slot", sr.getTimeSlot());
                    return map;
                })
                .collect(Collectors.toList());
    }

    private String maskNationalId(String nid) {
        if (nid == null || nid.length() < 13) return nid;
        return nid.substring(0, 3) + "-XXXXXX-" + nid.substring(11);
    }

    private String maskBankAccount(String acc) {
        if (acc == null || acc.length() < 6) return acc;
        return acc.substring(0, 3) + "-XXX-" + acc.substring(acc.length() - 3);
    }

    @Override
    public List<Map<String, Object>> getSettlementReport() {
        return withdrawRequestRepository.findAll().stream()
                .map(withdraw -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", withdraw.getId());
                    map.put("service_request_id", withdraw.getServiceRequest() != null ? withdraw.getServiceRequest().getId() : "-");
                    map.put("service_date", (withdraw.getServiceRequest() != null && withdraw.getServiceRequest().getStartDate() != null) ? withdraw.getServiceRequest().getStartDate().toString() : "");
                    map.put("nurse_name", withdraw.getNurse() != null ? (withdraw.getNurse().getFullname() + " " + withdraw.getNurse().getSurname()) : "-");
                    String acc = withdraw.getBankAccountNumber() != null ? withdraw.getBankAccountNumber() : (withdraw.getNurse() != null ? withdraw.getNurse().getBankAccountNumber() : "-");
                    String bName = withdraw.getBankName() != null ? withdraw.getBankName() : (withdraw.getNurse() != null && withdraw.getNurse().getBankName() != null ? withdraw.getNurse().getBankName() : "-");
                    map.put("bank_account", maskBankAccount(acc));
                    map.put("raw_bank_account", acc);
                    map.put("bank_name", bName);
                    map.put("amount", withdraw.getAmount());
                    boolean isPaid = "Paid".equalsIgnoreCase(withdraw.getStatus()) || "Transferred".equalsIgnoreCase(withdraw.getStatus());
                    map.put("status", isPaid ? "Paid" : "Pending");
                    return map;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void payFeeRequest(String id) {
        payFeeRequest(id, null);
    }

    @Override
    @Transactional
    public void payFeeRequest(String id, String adminUserId) {
        WithdrawRequest withdraw = withdrawRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ไม่พบคำขอเบิกเงิน"));
        if ("Paid".equalsIgnoreCase(withdraw.getStatus()) || "Transferred".equalsIgnoreCase(withdraw.getStatus())) {
            throw new RuntimeException("รายการนี้ถูกโอนจ่ายไปแล้ว");
        }
        withdraw.setStatus("Paid");
        withdraw.setProcessedAt(LocalDateTime.now());
        withdrawRequestRepository.save(withdraw);
    }
}