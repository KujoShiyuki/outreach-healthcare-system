package com.nursingcare.backend.service.impl;

import com.nursingcare.backend.dto.request.CareRecordDto;
import com.nursingcare.backend.dto.request.WithdrawRequestDto;
import com.nursingcare.backend.entity.CareRecords;
import com.nursingcare.backend.entity.WithdrawRequest;
import com.nursingcare.backend.entity.Nurse;
import com.nursingcare.backend.entity.HealthProfile;
import com.nursingcare.backend.entity.ServiceRequest;
import com.nursingcare.backend.entity.ServiceCategory;
import com.nursingcare.backend.repository.CareRecordRepository;
import com.nursingcare.backend.repository.WithdrawRequestRepository;
import com.nursingcare.backend.repository.HealthProfileRepository;
import com.nursingcare.backend.repository.NurseRepository;
import com.nursingcare.backend.repository.ServiceRequestRepository;
import com.nursingcare.backend.repository.ServiceCategoryRepository;
import com.nursingcare.backend.service.NurseService;
import com.nursingcare.backend.service.ShiftMatchingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class NurseServiceImpl implements NurseService {

    private final NurseRepository nurseRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final CareRecordRepository careRecordRepository;
    private final WithdrawRequestRepository withdrawRequestRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ShiftMatchingService shiftMatchingService;

    public NurseServiceImpl(NurseRepository nurseRepository,
                            ServiceRequestRepository serviceRequestRepository,
                            CareRecordRepository careRecordRepository,
                            WithdrawRequestRepository withdrawRequestRepository,
                            HealthProfileRepository healthProfileRepository,
                            ServiceCategoryRepository serviceCategoryRepository,
                            ShiftMatchingService shiftMatchingService) {
        this.nurseRepository = nurseRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.careRecordRepository = careRecordRepository;
        this.withdrawRequestRepository = withdrawRequestRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.serviceCategoryRepository = serviceCategoryRepository;
        this.shiftMatchingService = shiftMatchingService;
    }

    private Nurse getNurse(String userId) {
        return nurseRepository.findByUser_Id(userId)
                .orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลพยาบาล"));
    }

    private List<java.time.LocalDate> getServiceDates(ServiceRequest request) {
        if (request.getServiceDates() == null || request.getServiceDates().isBlank()) return Collections.emptyList();
        try {
            return Arrays.stream(request.getServiceDates().split(","))
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .map(java.time.LocalDate::parse)
                    .distinct()
                    .sorted()
                    .collect(Collectors.toList());
        } catch (java.time.format.DateTimeParseException ex) {
            throw new RuntimeException("รายการวันที่รับบริการในคำขอไม่ถูกต้อง");
        }
    }

    private void validateNurseCanWork(Nurse nurse) {
        if (!"Verified".equalsIgnoreCase(nurse.getApprovalStatus())) {
            throw new RuntimeException("บัญชีพยาบาลยังไม่ผ่านการตรวจสอบใบอนุญาต");
        }
        if (nurse.getUser() == null || !"Active".equalsIgnoreCase(nurse.getUser().getStatus())) {
            throw new RuntimeException("บัญชีพยาบาลไม่อยู่ในสถานะที่พร้อมให้บริการ");
        }
        if (nurse.getLicenseExpireDate() != null
                && nurse.getLicenseExpireDate().isBefore(java.time.LocalDate.now())) {
            throw new RuntimeException("ใบอนุญาตประกอบวิชาชีพหมดอายุแล้ว ไม่สามารถดำเนินงานได้");
        }
    }

    private boolean isActiveBooking(String status) {
        return Arrays.asList("Pending", "Accepted", "Paid", "InProgress").contains(status);
    }

    @Override
    public List<Map<String, Object>> publicSearchNurses(String area, String specialty, Boolean isSpecialist) {
        return publicSearchNurses(area, specialty, isSpecialist, null, null);
    }

    @Override
    public List<Map<String, Object>> publicSearchNurses(String area, String specialty, Boolean isSpecialist, String tier) {
        return publicSearchNurses(area, specialty, isSpecialist, tier, null);
    }

    @Override
    public List<Map<String, Object>> publicSearchNurses(String area, String specialty, Boolean isSpecialist, String tier, Boolean isRetired) {
        List<Nurse> nurses = nurseRepository.findAll();
        List<ServiceRequest> activeRequests = serviceRequestRepository.findAll().stream()
                .filter(sr -> isActiveBooking(sr.getStatus()))
                .collect(Collectors.toList());

        // ตรวจสอบว่าบริการที่ค้นหาต้องการใบประกอบวิชาชีพหรือไม่ (ถ้าค้นหาจาก Category)
        boolean requiresLicense = false;
        if (specialty != null && !specialty.trim().isEmpty() && (isSpecialist == null || !isSpecialist)) {
            Optional<ServiceCategory> cat = serviceCategoryRepository.findAll().stream()
                    .filter(s -> s.getCategoryName().equalsIgnoreCase(specialty.trim()))
                    .findFirst();
            if (cat.isPresent() && ("RN".equalsIgnoreCase(cat.get().getRequiredCertification()) || Boolean.TRUE.equals(cat.get().getIsSpecialized()))) {
                requiresLicense = true;
            }
        }

        final boolean finalRequiresLicense = requiresLicense;

        return nurses.stream()
                .filter(n -> n.getUser() != null)
                .filter(n -> "Verified".equalsIgnoreCase(n.getApprovalStatus()) && "Active".equalsIgnoreCase(n.getUser().getStatus()))
                .filter(n -> {
                    if (Boolean.TRUE.equals(isRetired)) {
                        return Boolean.TRUE.equals(n.getRetired());
                    }
                    return true;
                })
                .filter(n -> {
                    if (area == null || area.trim().isEmpty()) return true;
                    if (n.getServiceArea() == null || n.getServiceArea().trim().isEmpty()) return false;
                    String nurseArea = n.getServiceArea().toLowerCase().trim();
                    String searchArea = area.toLowerCase().trim();
                    if (nurseArea.contains(searchArea) || searchArea.contains(nurseArea)) return true;
                    // แยกตามเครื่องหมายจุลภาค เช่น "สันทราย, เชียงใหม่"
                    String[] tokens = searchArea.split("[,\\s]+");
                    for (String token : tokens) {
                        String clean = token.trim();
                        if (clean.length() >= 2 && nurseArea.contains(clean)) {
                            return true;
                        }
                    }
                    return false;
                })
                .filter(n -> {
                    // กรองตามระดับวิชาชีพ (Tier Matching)
                    if (tier != null && !tier.trim().isEmpty()) {
                        String req = tier.trim().toUpperCase();
                        String nurseTier = n.getProfessionalTier() != null ? n.getProfessionalTier().toUpperCase() : "CG";
                        if ("RN".equals(req)) {
                            if (!"RN".equals(nurseTier)) return false;
                        } else if ("PN".equals(req)) {
                            if (!"RN".equals(nurseTier) && !"PN".equals(nurseTier)) return false;
                        }
                    }

                    // ถ้าเป็นการค้นหาผู้เชี่ยวชาญ (Specialist Upgrade)
                    if (isSpecialist != null && isSpecialist) {
                        return specialty == null || specialty.trim().isEmpty() ||
                               (n.getSpecialty() != null && n.getSpecialty().toLowerCase().contains(specialty.toLowerCase()));
                    }

                    // ถ้าเป็นการค้นหาบริการหลัก (Base Service)
                    // ถ้าบริการหลักต้องการใบประกอบ (requires_license = true) พยาบาลต้องเป็น RN เท่านั้น
                    if (finalRequiresLicense && !"RN".equalsIgnoreCase(n.getProfessionalTier())) {
                        return false;
                    }

                    return true;
                })
                .map(n -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("nurse_id", n.getId());
                    map.put("fullname", n.getFullname());
                    map.put("surname", n.getSurname());
                    map.put("professional_tier", n.getProfessionalTier());
                    map.put("service_area", n.getServiceArea());
                    map.put("specialty", n.getSpecialty());
                    map.put("approval_status", n.getApprovalStatus());
                    map.put("is_specialist", n.getSpecialty() != null && !n.getSpecialty().trim().isEmpty() && !n.getSpecialty().contains("ทั่วไป"));
                    map.put("availability_type", n.getAvailabilityType() != null ? n.getAvailabilityType().name() : "FIXED_TIME");
                    // Scheduling and distance data are required by the matching flow; direct phone contact is withheld.
                    String scheduleJson = (n.getShiftSchedule() != null && !n.getShiftSchedule().isBlank())
                            ? n.getShiftSchedule()
                            : (Boolean.TRUE.equals(n.getRetired())
                                    ? "{\"shifts\":[\"morning_8h\",\"afternoon_8h\",\"day_12h\",\"night_12h\"],\"days\":[\"จันทร์\",\"อังคาร\",\"พุธ\",\"พฤหัสบดี\",\"ศุกร์\",\"เสาร์\",\"อาทิตย์\"],\"nurse_work_type\":\"FREELANCE\",\"hospital_code_schedule\":{}}"
                                    : "{\"shifts\":[\"morning_8h\",\"afternoon_8h\"],\"days\":[\"จันทร์\",\"อังคาร\",\"พุธ\",\"พฤหัสบดี\",\"ศุกร์\",\"เสาร์\",\"อาทิตย์\"],\"trade_note\":\"\",\"nurse_work_type\":\"HOSPITAL_STAFF\",\"hospital_code_schedule\":{}}");
                    map.put("shift_schedule", scheduleJson);
                    map.put("latitude", n.getLatitude());
                    map.put("longitude", n.getLongitude());
                    map.put("service_radius_km", n.getServiceRadiusKm() != null ? n.getServiceRadiusKm() : 10.0);
                    map.put("is_retired", Boolean.TRUE.equals(n.getRetired()));
                    map.put("license_expire_date", n.getLicenseExpireDate() != null ? n.getLicenseExpireDate().toString() : null);

                    List<Map<String, Object>> nurseActiveBookings = activeRequests.stream()
                            .filter(sr -> sr.getNurse() != null && sr.getNurse().getId().equals(n.getId()))
                            .map(sr -> {
                                Map<String, Object> b = new HashMap<>();
                                b.put("request_id", sr.getId());
                                b.put("start_date", sr.getStartDate());
                                b.put("end_date", sr.getEndDate() != null ? sr.getEndDate().toString() : sr.getStartDate());
                                b.put("time_slot", sr.getTimeSlot());
                                b.put("status", sr.getStatus());
                                boolean isMonthly = sr.getServicePackage() != null
                                        && "Monthly".equalsIgnoreCase(sr.getServicePackage().getSubscriptionType());
                                b.put("is_monthly", isMonthly);
                                if (sr.getServiceDates() != null && !sr.getServiceDates().isBlank()) {
                                    b.put("service_dates", Arrays.stream(sr.getServiceDates().split(","))
                                            .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList()));
                                } else {
                                    b.put("service_dates", Collections.emptyList());
                                }
                                return b;
                            })
                            .collect(Collectors.toList());
                    map.put("active_bookings", nurseActiveBookings);

                    return map;
                })
                .collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getNurseProfile(String userId) {
        Nurse nurse = getNurse(userId);
        Map<String, Object> map = new HashMap<>();
        map.put("first_name", nurse.getFullname());
        map.put("last_name", nurse.getSurname());
        map.put("approval_status", nurse.getApprovalStatus());
        map.put("professional_tier", nurse.getProfessionalTier());
        map.put("license_no", nurse.getLicenseNumber());
        map.put("national_id", nurse.getNationalId());
        map.put("service_area", nurse.getServiceArea());
        map.put("specialty", nurse.getSpecialty());
        map.put("phone", nurse.getPhoneNumber());
        map.put("bank_account_no", nurse.getBankAccountNumber());
        map.put("bank_name", nurse.getBankName());
        map.put("availability_type", nurse.getAvailabilityType() != null ? nurse.getAvailabilityType().name() : "FIXED_TIME");
        map.put("license_issue_date", nurse.getLicenseIssueDate() != null ? nurse.getLicenseIssueDate().toString() : "");
        map.put("license_expire_date", nurse.getLicenseExpireDate() != null ? nurse.getLicenseExpireDate().toString() : "");
        map.put("shift_schedule", nurse.getShiftSchedule() != null ? nurse.getShiftSchedule() : "");
        map.put("latitude", nurse.getLatitude());
        map.put("longitude", nurse.getLongitude());
        map.put("service_radius_km", nurse.getServiceRadiusKm() != null ? nurse.getServiceRadiusKm() : 10.0);
        map.put("is_retired", Boolean.TRUE.equals(nurse.getRetired()));
        map.put("license_file_url", nurse.getLicenseFileUrl() != null ? nurse.getLicenseFileUrl() : "");
        return map;
    }

    @Override
    @Transactional
    public void updateNurseProfile(String userId, Map<String, Object> updates) {
        Nurse nurse = getNurse(userId);
        boolean credentialChanged = false;

        // ตรวจสอบการแก้ไขเลขที่ใบประกอบวิชาชีพ
        if (updates.containsKey("license_no")) {
            String newLic = (String) updates.get("license_no");
            if (newLic != null && !newLic.trim().isEmpty() && !newLic.trim().equals(nurse.getLicenseNumber())) {
                nurse.setLicenseNumber(newLic.trim());
                credentialChanged = true;
            }
        }

        // ตรวจสอบการแก้ไขวันออกใบอนุญาต
        if (updates.containsKey("license_issue_date")) {
            String issueStr = (String) updates.get("license_issue_date");
            if (issueStr != null && !issueStr.isEmpty()) {
                java.time.LocalDate newIssue = java.time.LocalDate.parse(issueStr);
                if (!newIssue.equals(nurse.getLicenseIssueDate())) {
                    nurse.setLicenseIssueDate(newIssue);
                    credentialChanged = true;
                }
            }
        }

        // ตรวจสอบการแก้ไขวันหมดอายุใบอนุญาต (การต่ออายุใบอนุญาต)
        if (updates.containsKey("license_expire_date")) {
            String expStr = (String) updates.get("license_expire_date");
            if (expStr != null && !expStr.isEmpty()) {
                java.time.LocalDate newExp = java.time.LocalDate.parse(expStr);
                if (!newExp.equals(nurse.getLicenseExpireDate())) {
                    nurse.setLicenseExpireDate(newExp);
                    credentialChanged = true;
                }
            }
        }

        // ตรวจสอบการอัปโหลดไฟล์ใบอนุญาตใหม่
        if (updates.containsKey("license_file_url")) {
            String fileUrl = (String) updates.get("license_file_url");
            if (fileUrl != null && !fileUrl.isEmpty() && !fileUrl.equals(nurse.getLicenseFileUrl())) {
                nurse.setLicenseFileUrl(fileUrl);
                credentialChanged = true;
            }
        }

        // หากมีการแก้ไขข้อมูลวิชาชีพสำคัญ ให้เปลี่ยนสถานะกลับเป็น Pending เพื่อรอผู้ดูแลระบบตรวจสอบใหม่
        if (credentialChanged) {
            nurse.setApprovalStatus("Pending");
        }

        if (updates.containsKey("professional_tier")) {
            String newTier = (String) updates.get("professional_tier");
            if (!Arrays.asList("RN", "PN", "CG").contains(newTier)) {
                throw new RuntimeException("ระดับวิชาชีพไม่ถูกต้อง");
            }
            if (!newTier.equalsIgnoreCase(nurse.getProfessionalTier())) {
                nurse.setProfessionalTier(newTier);
                nurse.setApprovalStatus("Pending");
            }
        }
        if (updates.containsKey("service_area")) nurse.setServiceArea((String) updates.get("service_area"));
        if (updates.containsKey("specialty")) nurse.setSpecialty((String) updates.get("specialty"));
        if (updates.containsKey("phone")) nurse.setPhoneNumber((String) updates.get("phone"));
        if (updates.containsKey("bank_account_no")) nurse.setBankAccountNumber((String) updates.get("bank_account_no"));
        if (updates.containsKey("bank_name")) nurse.setBankName((String) updates.get("bank_name"));
        if (updates.containsKey("shift_schedule")) nurse.setShiftSchedule((String) updates.get("shift_schedule"));
        if (updates.containsKey("latitude") && updates.get("latitude") != null) {
            nurse.setLatitude(Double.valueOf(updates.get("latitude").toString()));
        }
        if (updates.containsKey("longitude") && updates.get("longitude") != null) {
            nurse.setLongitude(Double.valueOf(updates.get("longitude").toString()));
        }
        if (updates.containsKey("service_radius_km") && updates.get("service_radius_km") != null) {
            nurse.setServiceRadiusKm(Double.valueOf(updates.get("service_radius_km").toString()));
        }
        if (updates.containsKey("is_retired") && updates.get("is_retired") != null) {
            nurse.setRetired(Boolean.valueOf(updates.get("is_retired").toString()));
        }
        if (updates.containsKey("availability_type")) {
            try {
                nurse.setAvailabilityType(com.nursingcare.backend.enums.AvailabilityType.valueOf((String) updates.get("availability_type")));
            } catch (Exception e) {
                // Ignore or set default
            }
        }
        nurseRepository.save(nurse);
    }

    @Override
    public Map<String, List<Map<String, Object>>> getNurseRequests(String userId) {
        Nurse nurse = getNurse(userId);
        List<ServiceRequest> requests = serviceRequestRepository.findAll().stream()
                .filter(req -> req.getNurse() != null && req.getNurse().getId().equals(nurse.getId()))
                .collect(Collectors.toList());

        List<Map<String, Object>> pending = new ArrayList<>();
        List<Map<String, Object>> active = new ArrayList<>();

        for (ServiceRequest req : requests) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", req.getId());
            map.put("patient_name", req.getPatient().getFirstname() + " " + req.getPatient().getLastname());
            map.put("patient_age", req.getPatient().getAge());
            map.put("patient_gender", req.getPatient().getGender());
            map.put("start_date", req.getStartDate() != null ? req.getStartDate().toString() : "");
            map.put("end_date", req.getEndDate() != null ? req.getEndDate().toString() : "");
            map.put("service_dates", req.getServiceDates());
            map.put("time_slot", req.getTimeSlot());
            map.put("service_address", req.getServiceAddress());
            map.put("status", req.getStatus());
            map.put("total_price", req.getTotalPrice());
            int totalVisits = req.getServiceCount() != null ? req.getServiceCount() : 1;
            int remainingVisits = req.getRemainingServiceCount() != null ? req.getRemainingServiceCount() : totalVisits;
            map.put("service_count", totalVisits);
            map.put("remaining_service_count", remainingVisits);
            map.put("completed_service_count", Math.max(0, totalVisits - remainingVisits));
            map.put("subscription_type", req.getServicePackage() != null ? req.getServicePackage().getSubscriptionType() : "Per Cycle");
            map.put("care_record_count", careRecordRepository.findByServiceRequest_IdOrderByVisitDateDesc(req.getId()).size());
            map.put("service_type_name", req.getServiceTypeName());
            map.put("package_name", req.getServicePackage() != null ? req.getServicePackage().getPackageName() : "รายครั้ง");
            map.put("additional_notes", req.getAdditionalNotes());
            map.put("special_precautions", req.getSpecialPrecautions());
            map.put("is_complex_wound", req.getIsComplexWound());
            map.put("wound_photo_url", req.getWoundPhotoUrl());
            map.put("patient_id", req.getPatient().getId()); // ส่ง ID ไปให้ Frontend ไปดึงประวัติต่อได้
            withdrawRequestRepository.findByServiceRequest_Id(req.getId()).ifPresent(fee -> {
                map.put("fee_request_status", fee.getStatus());
                map.put("fee_request_id", fee.getId());
                map.put("withdraw_request_status", fee.getStatus());
                map.put("withdraw_request_id", fee.getId());
            });

            Optional<HealthProfile> hpOpt = healthProfileRepository.findByPatient_Id(req.getPatient().getId());
            if (hpOpt.isPresent()) {
                HealthProfile hp = hpOpt.get();
                map.put("chief_complaint", hp.getChiefComplaint() != null ? hp.getChiefComplaint() : "ไม่มีการระบุอาการ");
                map.put("underlying_diseases", hp.getCongenitalDisease() != null ? hp.getCongenitalDisease() : "-");

                String allergyInfo = "";
                if (hp.getDrugAllergy() != null && !hp.getDrugAllergy().trim().isEmpty()) {
                    allergyInfo += "ยา: " + hp.getDrugAllergy().trim();
                }
                if (hp.getFoodAllergy() != null && !hp.getFoodAllergy().trim().isEmpty()) {
                    allergyInfo += (allergyInfo.isEmpty() ? "" : ", ") + "อาหาร: " + hp.getFoodAllergy().trim();
                }
                map.put("allergies", allergyInfo.isEmpty() ? "ไม่มีประวัติแพ้ยา/อาหาร" : allergyInfo);
                map.put("current_assistance", hp.getCurrentAssistance() != null ? hp.getCurrentAssistance() : "-");
            } else {
                map.put("chief_complaint", "ไม่มีการระบุอาการ");
                map.put("underlying_diseases", "-");
                map.put("allergies", "ไม่มี");
                map.put("current_assistance", "-");
            }

            if ("Pending".equals(req.getStatus())) {
                pending.add(map);
            } else {
                active.add(map);
            }
        }

        Map<String, List<Map<String, Object>>> result = new HashMap<>();
        result.put("pending", pending);
        result.put("active", active);
        return result;
    }

    @Override
    @Transactional
    public void respondToRequest(String userId, String requestId, String action) {
        respondToRequest(userId, requestId, action, null);
    }

    @Override
    @Transactional
    public void respondToRequest(String userId, String requestId, String action, String reason) {
        Nurse nurse = getNurse(userId);
        ServiceRequest req = serviceRequestRepository.findById(requestId).orElseThrow(() -> new RuntimeException("ไม่พบคำขอรับบริการ"));
        if (!req.getNurse().getId().equals(nurse.getId())) throw new RuntimeException("คำขอนี้ไม่ได้ระบุถึงคุณ");
        if (!"Pending".equals(req.getStatus())) throw new RuntimeException("คำขอนี้ถูกดำเนินการไปแล้ว");
        validateNurseCanWork(nurse);

        if ("Accept".equals(action)) {
            java.time.LocalDate effectiveEnd = req.getEndDate() != null ? req.getEndDate() : (req.getStartDate() != null ? java.time.LocalDate.parse(req.getStartDate()) : null);
            if (nurse.getLicenseExpireDate() != null && effectiveEnd != null && effectiveEnd.isAfter(nurse.getLicenseExpireDate())) {
                throw new RuntimeException("ไม่สามารถรับงานได้ เนื่องจากวันที่ให้บริการสิ้นสุด (" + effectiveEnd + ") หลังวันหมดอายุใบอนุญาตประกอบวิชาชีพของคุณ (" + nurse.getLicenseExpireDate() + ")");
            }
            List<java.time.LocalDate> dates = getServiceDates(req);
            if (!dates.isEmpty()) {
                if (nurse.getLicenseExpireDate() != null && dates.stream().anyMatch(d -> d.isAfter(nurse.getLicenseExpireDate()))) {
                    throw new RuntimeException("ไม่สามารถรับงานได้ เนื่องจากมีวันที่ให้บริการหลังวันหมดอายุใบอนุญาตประกอบวิชาชีพของคุณ");
                }
                shiftMatchingService.validateRoster(nurse, dates, req.getTimeSlot());
            }
            req.setStatus("Accepted");
        } else if ("Reject".equals(action)) {
            req.setStatus("Rejected");
            if (reason != null && !reason.trim().isEmpty()) {
                String existing = req.getAdditionalNotes() != null ? req.getAdditionalNotes() : "";
                req.setAdditionalNotes((existing.isEmpty() ? "" : existing + "\n") + "[เหตุผลที่ปฏิเสธโดยพยาบาล: " + reason.trim() + "]");
            }
        }
        serviceRequestRepository.save(req);
    }

    @Override
    @Transactional
    public void recordCareVisit(String userId, String requestId, CareRecordDto request) {
        Nurse nurse = getNurse(userId);
        ServiceRequest req = serviceRequestRepository.findById(requestId).orElseThrow(() -> new RuntimeException("ไม่พบคำขอรับบริการ"));
        boolean isAssignedNurse = (req.getNurse() != null && req.getNurse().getId().equals(nurse.getId()));
        if (!isAssignedNurse) throw new RuntimeException("คุณไม่มีสิทธิ์บันทึกข้อมูลบริการนี้");
        validateNurseCanWork(nurse);
        if (!"Paid".equals(req.getStatus()) && !"InProgress".equals(req.getStatus())) throw new RuntimeException("สถานะไม่พร้อมให้บริการ (ต้องชำระเงินก่อน)");

        java.time.LocalDate targetVisitDate = request.getVisit_date() != null ? request.getVisit_date() : java.time.LocalDate.now();

        // ตรวจสอบว่าวันที่บันทึกงานต้องไม่เกินวันหมดอายุใบอนุญาตของพยาบาล
        if (nurse.getLicenseExpireDate() != null && targetVisitDate.isAfter(nurse.getLicenseExpireDate())) {
            throw new RuntimeException("ไม่สามารถบันทึกการดูแลได้ เนื่องจากใบอนุญาตประกอบวิชาชีพหมดอายุแล้ว ณ วันที่ให้บริการ (" + targetVisitDate + ")");
        }

        // ตรวจสอบว่าวันที่บันทึกงานต้องไม่ใช่วันที่ในอนาคต
        if (targetVisitDate.isAfter(java.time.LocalDate.now())) {
            throw new RuntimeException("ไม่สามารถบันทึกการให้บริการล่วงหน้าในอนาคตได้");
        }

        List<java.time.LocalDate> allowedDates = getServiceDates(req);
        if (!allowedDates.isEmpty() && !allowedDates.contains(targetVisitDate)) {
            throw new RuntimeException("วันที่บันทึกการดูแล (" + targetVisitDate + ") ไม่ตรงกับวันที่นัดหมายในคำขอรับบริการ");
        }

        // ตรวจสอบเวลา Check-in และ Check-out (หากระบุ)
        if (request.getBlood_pressure() != null && !request.getBlood_pressure().matches("^\\d{2,3}/\\d{2,3}$")) {
            throw new RuntimeException("รูปแบบความดันโลหิตไม่ถูกต้อง");
        }

        if (request.getCheck_in_time() != null && request.getCheck_out_time() != null) {
            if (!request.getCheck_out_time().isAfter(request.getCheck_in_time())) {
                throw new RuntimeException("เวลาสิ้นสุดการดูแล (Check-out) ต้องอยู่หลังเวลาเริ่มต้น (Check-in) (สามารถเป็นวันเดียวกันได้ แต่เวลาต้องไม่เท่ากันหรือก่อนหน้า)");
            }
        }

        // 1. ป้องกันการบันทึกซ้ำซ้อนในวันเดียวกัน (จำกัด 1 ครั้งต่อ 1 วันตามปฏิทิน เพื่อป้องกันการโกง)
        Optional<CareRecords> existingDailyRecord = careRecordRepository.findByServiceRequest_IdAndVisitDate(requestId, targetVisitDate);
        if (existingDailyRecord.isPresent()) {
            throw new RuntimeException("ในวันที่ " + targetVisitDate + " มีการบันทึกการให้บริการไปแล้ว (ระบบอนุญาตให้บันทึกได้เพียง 1 ครั้งต่อวันเท่านั้น)");
        }

        CareRecords care = new CareRecords();
        care.setId(UUID.randomUUID().toString());
        care.setServiceRequest(req);
        care.setBloodPressure(request.getBlood_pressure());
        care.setHeartRate(request.getHeart_rate());
        care.setBodyTemperature(request.getBody_temperature());
        care.setRespiratoryRate(request.getRespiratory_rate());
        care.setOxygenSaturation(request.getOxygen_saturation());
        care.setPainScore(request.getPain_score());
        care.setPainLocation(request.getPain_location());
        care.setSymptomSummary(request.getSymptom_summary());
        care.setMedicationRecord(request.getMedication_record());
        care.setVisitDate(targetVisitDate);
        care.setConsciousness(request.getConsciousness());
        care.setWeight(request.getWeight());
        care.setExcretion(request.getExcretion());
        care.setPatientCondition(request.getPatient_condition());
        care.setCareGiven(request.getCare_given());
        care.setCheckInTime(request.getCheck_in_time());
        care.setCheckOutTime(request.getCheck_out_time());
        care.setFollowUpDate(request.getFollow_up_date());
        care.setCareImageUrl(request.getCare_image_url());
        careRecordRepository.save(care);

        // จัดการนับจำนวนครั้งที่ให้บริการ (Service Count Tracking)
        int totalCount = req.getServiceCount() != null && req.getServiceCount() > 0 ? req.getServiceCount() : 1;
        int remaining = req.getRemainingServiceCount() != null ? req.getRemainingServiceCount() : totalCount;

        remaining = Math.max(0, remaining - 1);
        req.setRemainingServiceCount(remaining);

        // ถ้ายังมีจำนวนครั้งคงเหลือ > 0 ให้คงสถานะเป็น InProgress (กำลังให้บริการต่อเนื่อง)
        // เมื่อครบตามจำนวนครั้งแล้ว (remaining == 0) จึงปรับเป็น Completed (เสร็จสิ้นสมบูรณ์)
        if (remaining > 0) {
            req.setStatus("InProgress");
        } else {
            req.setStatus("Completed");
        }
        serviceRequestRepository.save(req);
    }

    @Override
    @Transactional
    public void requestFee(String userId, WithdrawRequestDto request) {
        Nurse nurse = getNurse(userId);
        ServiceRequest req = serviceRequestRepository.findById(request.getService_request_id()).orElseThrow(() -> new RuntimeException("ไม่พบคำขอรับบริการ"));
        boolean isAssignedNurse = (req.getNurse() != null && req.getNurse().getId().equals(nurse.getId()));
        if (!isAssignedNurse) throw new RuntimeException("คุณไม่มีสิทธิ์เบิกเงินค่าบริการนี้");
        if (!"Completed".equals(req.getStatus())) throw new RuntimeException("คุณต้องให้บริการเสร็จสิ้นก่อนจึงจะเบิกเงินได้");

        // ตรวจสอบว่าเบิกซ้ำหรือไม่ โดยให้ฐานข้อมูลช่วยบังคับความถูกต้อง
        if (withdrawRequestRepository.existsByServiceRequest_Id(req.getId())) {
            throw new RuntimeException("คุณได้ส่งคำขอเบิกเงินสำหรับรายการนี้ไปแล้ว");
        }

        // ล็อคยอดเบิกเงิน: อิงตาม totalPrice ที่บันทึกไว้ใน ServiceRequest เท่านั้น เพื่อป้องกัน Client ส่งยอดเกินจริง
        Double approvedAmount = req.getTotalPrice() != null && req.getTotalPrice() > 0 ? req.getTotalPrice() : (request.getAmount() != null ? request.getAmount() : 0.0);

        WithdrawRequest withdraw = new WithdrawRequest();
        withdraw.setId(UUID.randomUUID().toString());
        withdraw.setNurse(nurse);
        withdraw.setServiceRequest(req);
        withdraw.setAmount(approvedAmount);
        withdraw.setStatus("Pending");
        withdraw.setRequestedAt(LocalDateTime.now());
        withdraw.setBankAccountNumber(nurse.getBankAccountNumber());
        withdraw.setBankName(nurse.getBankName());
        withdrawRequestRepository.save(withdraw);
    }

    @Override
    public List<Map<String, Object>> getPatientCareHistory(String userId, String patientId) {
        // ยืนยันว่าคนเรียกเป็นพยาบาลจริง
        Nurse nurse = getNurse(userId);

        // ตรวจสอบสิทธิ์ (Ownership check): พยาบาลต้องได้รับมอบหมายให้ดูแลผู้ป่วยรายนี้ใน ServiceRequest
        boolean isAssignedToPatient = serviceRequestRepository.findAll().stream()
                .anyMatch(sr -> sr.getNurse() != null && sr.getNurse().getId().equals(nurse.getId()) &&
                        sr.getPatient() != null &&
                        sr.getPatient().getId().equals(patientId) &&
                        Arrays.asList("Pending", "Accepted", "Paid", "InProgress", "Completed").contains(sr.getStatus()));

        if (!isAssignedToPatient) {
            throw new RuntimeException("คุณไม่มีสิทธิ์เข้าถึงประวัติการดูแลของผู้ป่วยท่านนี้");
        }

        List<CareRecords> records = careRecordRepository.findAccessibleByPatientAndNurse(patientId, nurse.getId());

        return records.stream().map(cr -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", cr.getId());
            map.put("visit_date", cr.getVisitDate() != null ? cr.getVisitDate().toString() : "");
            map.put("blood_pressure", cr.getBloodPressure());
            map.put("heart_rate", cr.getHeartRate());
            map.put("respiratory_rate", cr.getRespiratoryRate());
            map.put("body_temperature", cr.getBodyTemperature());
            map.put("oxygen_saturation", cr.getOxygenSaturation());
            map.put("pain_score", cr.getPainScore());
            map.put("symptom_summary", cr.getSymptomSummary());
            map.put("medication_record", cr.getMedicationRecord());

            if (cr.getServiceRequest() != null) {
                map.put("service_type", cr.getServiceRequest().getServiceTypeName());
                if (cr.getServiceRequest().getNurse() != null) {
                    map.put("nurse_name", cr.getServiceRequest().getNurse().getFullname() + " " + cr.getServiceRequest().getNurse().getSurname());
                }
            }
            return map;
        }).collect(Collectors.toList());
    }
}