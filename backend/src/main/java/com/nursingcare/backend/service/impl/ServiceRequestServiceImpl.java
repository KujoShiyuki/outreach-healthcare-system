package com.nursingcare.backend.service.impl;
import com.nursingcare.backend.dto.request.ServiceRequestCreateDto;
import com.nursingcare.backend.entity.*;
import com.nursingcare.backend.repository.*;
import com.nursingcare.backend.service.ClinicalMatchingService;
import com.nursingcare.backend.service.ServiceRequestService;
import com.nursingcare.backend.service.ShiftMatchingService;
import com.nursingcare.backend.service.SlipVerificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ServiceRequestServiceImpl implements ServiceRequestService {
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final NurseRepository nurseRepository;
    private final MemberRepository memberRepository;
    private final PatientRepository patientRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final CareRecordRepository careRecordRepository;
    private final UserRepository userRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final SlipVerificationService slipVerificationService;
    private final ShiftMatchingService shiftMatchingService;
    private final ClinicalMatchingService clinicalMatchingService;

    public ServiceRequestServiceImpl(ServiceCategoryRepository serviceCategoryRepository,
                                     ServicePackageRepository servicePackageRepository,
                                     NurseRepository nurseRepository,
                                     MemberRepository memberRepository,
                                     PatientRepository patientRepository,
                                     ServiceRequestRepository serviceRequestRepository,
                                     CareRecordRepository careRecordRepository,
                                     UserRepository userRepository,
                                     HealthProfileRepository healthProfileRepository,
                                     SlipVerificationService slipVerificationService,
                                     ShiftMatchingService shiftMatchingService,
                                     ClinicalMatchingService clinicalMatchingService) {
        this.serviceCategoryRepository = serviceCategoryRepository;
        this.servicePackageRepository = servicePackageRepository;
        this.nurseRepository = nurseRepository;
        this.memberRepository = memberRepository;
        this.patientRepository = patientRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.careRecordRepository = careRecordRepository;
        this.userRepository = userRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.slipVerificationService = slipVerificationService;
        this.shiftMatchingService = shiftMatchingService;
        this.clinicalMatchingService = clinicalMatchingService;
    }

    private Member getMember(String userId) {
        return memberRepository.findByUser_Id(userId).orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลสมาชิก"));
    }

    private void checkOwnership(ServiceRequest sr, Member member) {
        if (!sr.getPatient().getMember().getId().equals(member.getId())) {
            throw new RuntimeException("คุณไม่มีสิทธิ์เข้าถึงคำขอนี้");
        }
    }

    private java.time.LocalDate parseStartDate(String value) {
        try {
            return value == null || value.isBlank() ? null : java.time.LocalDate.parse(value);
        } catch (java.time.format.DateTimeParseException ex) {
            throw new RuntimeException("รูปแบบวันเริ่มต้นไม่ถูกต้อง ต้องเป็น YYYY-MM-DD");
        }
    }

    private java.time.LocalDate getEffectiveEndDate(ServiceRequest request) {
        return request.getEndDate() != null ? request.getEndDate() : parseStartDate(request.getStartDate());
    }

    private List<LocalDate> getStoredDates(ServiceRequest request) {
        if (request.getServiceDates() == null || request.getServiceDates().isBlank()) return Collections.emptyList();
        try {
            return Arrays.stream(request.getServiceDates().split(","))
                    .map(String::trim).filter(value -> !value.isEmpty()).map(LocalDate::parse)
                    .distinct().sorted().collect(Collectors.toList());
        } catch (DateTimeParseException ex) {
            return Collections.emptyList();
        }
    }

    private List<LocalDate> getRequestedDates(ServiceRequestCreateDto request, LocalDate incomingStart, LocalDate incomingEnd) {
        if (request.getService_dates() == null || request.getService_dates().isEmpty()) {
            List<LocalDate> dates = new ArrayList<>();
            for (LocalDate date = incomingStart; !date.isAfter(incomingEnd); date = date.plusDays(1)) {
                dates.add(date);
            }
            return dates;
        }

        try {
            List<LocalDate> dates = request.getService_dates().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .map(LocalDate::parse)
                    .distinct()
                    .sorted()
                    .collect(Collectors.toList());
            if (dates.isEmpty() || !dates.get(0).equals(incomingStart)
                    || !dates.get(dates.size() - 1).equals(incomingEnd)) {
                throw new RuntimeException("รายการวันที่รับบริการต้องสอดคล้องกับวันเริ่มต้นและวันสิ้นสุด");
            }
            return dates;
        } catch (DateTimeParseException ex) {
            throw new RuntimeException("รูปแบบวันที่รับบริการไม่ถูกต้อง ต้องเป็น YYYY-MM-DD");
        }
    }

    private boolean dateRangesOverlap(java.time.LocalDate incomingStart, java.time.LocalDate incomingEnd,
                                      java.time.LocalDate existingStart, java.time.LocalDate existingEnd) {
        return !incomingEnd.isBefore(existingStart) && !incomingStart.isAfter(existingEnd);
    }

    private boolean isActiveBooking(String status) {
        return Arrays.asList("Pending", "Accepted", "Paid", "InProgress").contains(status);
    }

    private boolean isMonthlySubscription(ServiceRequest request) {
        return request.getServicePackage() != null
                && "Monthly".equalsIgnoreCase(request.getServicePackage().getSubscriptionType());
    }


    @Override
    public Map<String, Object> listServiceTypes() {
        List<ServiceCategory> categories = serviceCategoryRepository.findAll();
        List<Map<String, Object>> types = categories.stream().map(cat -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", cat.getId());
            map.put("service_type_id", cat.getId());
            map.put("typeName", cat.getCategoryName());
            map.put("type_name", cat.getCategoryName());
            map.put("typeGroup", cat.getCategoryGroup());
            map.put("type_group", cat.getCategoryGroup());
            map.put("requiresLicense", "RN".equalsIgnoreCase(cat.getRequiredCertification()));
            map.put("isSpecialized", Boolean.TRUE.equals(cat.getIsSpecialized()));
            map.put("basePrice", 800.0);
            map.put("description", cat.getDescription());
            return map;
        }).collect(Collectors.toList());

        return Map.of(
            "types", types,
            "packages", servicePackageRepository.findAll(),
            "categories", categories
        );
    }

    @Override
    @Transactional
    public Map<String, Object> requestService(String userId, ServiceRequestCreateDto request) {
        Member member = getMember(userId);
        Patient patient = patientRepository.findById(request.getPatient_id())
            .orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลผู้ป่วย"));
        if (!patient.getMember().getId().equals(member.getId())) {
            throw new RuntimeException("คุณไม่มีสิทธิ์สร้างคำขอให้ผู้ป่วยท่านนี้");
        }
        if ("INACTIVE".equalsIgnoreCase(patient.getStatus())) {
            throw new RuntimeException("ผู้ป่วยรายนี้ถูกพักการดูแลอยู่ ไม่สามารถสร้างคำขอรับบริการได้ กรุณาเปิดการดูแลผู้ป่วยก่อน");
        }

        // ป้องกันการจองซ้ำโดยตรวจช่วงวันที่ทับซ้อนกัน ไม่ใช่เฉพาะวันเริ่มต้น
        java.time.LocalDate incomingStart = parseStartDate(request.getStart_date());
        if (incomingStart == null) {
            throw new RuntimeException("กรุณาระบุวันเริ่มต้นให้ถูกต้อง");
        }
        java.time.LocalDate incomingEnd = request.getEnd_date() != null ? request.getEnd_date() : incomingStart;
        if (incomingEnd.isBefore(incomingStart)) {
            throw new RuntimeException("วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น");
        }
        List<LocalDate> requestedDates = getRequestedDates(request, incomingStart, incomingEnd);

        List<ServiceRequest> existingPatientRequests = serviceRequestRepository.findAll().stream()
                .filter(existing -> existing.getPatient().getId().equals(patient.getId()))
                .filter(existing -> isActiveBooking(existing.getStatus()))
                .collect(Collectors.toList());

        boolean isIncomingMonthly = request.getPackage_id() != null && servicePackageRepository.findById(request.getPackage_id())
                .map(sp -> "Monthly".equalsIgnoreCase(sp.getSubscriptionType())).orElse(false);
        if (isIncomingMonthly && requestedDates.size() != 30) {
            throw new RuntimeException("แพ็กเกจรายเดือนต้องมีวันที่รับบริการครบ 30 วัน");
        }

        for (ServiceRequest existing : existingPatientRequests) {
            boolean isExistingMonthly = existing.getServicePackage() != null && "Monthly".equalsIgnoreCase(existing.getServicePackage().getSubscriptionType());
            if (isIncomingMonthly && isExistingMonthly) {
                throw new RuntimeException("ผู้ป่วยมีสัญญาเหมาจ่ายรายเดือนที่กำลังดำเนินการอยู่แล้ว ไม่สามารถจองซ้ำได้");
            }

            java.time.LocalDate existingStart = parseStartDate(existing.getStartDate());
            List<LocalDate> existingDates = getStoredDates(existing);
            java.time.LocalDate existingEnd = getEffectiveEndDate(existing);
            boolean datesOverlap = !existingDates.isEmpty()
                    ? existingDates.stream().anyMatch(requestedDates::contains)
                    : existingStart != null && existingEnd != null
                    && requestedDates.stream().anyMatch(date -> !date.isBefore(existingStart) && !date.isAfter(existingEnd));
            if (datesOverlap && request.getTime_slot() != null && existing.getTimeSlot() != null
                    && request.getTime_slot().equalsIgnoreCase(existing.getTimeSlot())) {
                throw new RuntimeException("ผู้ป่วยมีนัดหมายในวันที่เลือกและช่วงเวลาเดียวกัน ไม่สามารถจองซ้ำได้");
            }
        }

        ServicePackage sp = null;
        if (request.getPackage_id() != null && !request.getPackage_id().isEmpty()) {
            sp = servicePackageRepository.findById(request.getPackage_id()).orElse(null);
        }
        if (sp == null) {
            List<ServicePackage> allPkgs = servicePackageRepository.findAll();
            if (request.getService_type_id() != null) {
                sp = allPkgs.stream()
                        .filter(p -> p.getServiceCategory() != null && p.getServiceCategory().getId().equals(request.getService_type_id()))
                        .findFirst().orElse(null);
            }
            if (sp == null && !allPkgs.isEmpty()) {
                sp = allPkgs.get(0);
            }
        }

        ServiceRequest sr = new ServiceRequest();
        sr.setId(UUID.randomUUID().toString());
        sr.setPatient(patient);
        sr.setServicePackage(sp);

        // === คำนวณราคา ===
        Double basePrice = 800.0;
        Double packageExtra = 0.0;
        if (sp != null) {
            if ("Monthly".equalsIgnoreCase(sp.getSubscriptionType()) && sp.getPricePerMonth() != null) {
                basePrice = sp.getPricePerMonth(); // รายเดือนใช้ราคาแพ็กเกจตรงๆ
            } else if (sp.getPricePerCycle() != null) {
                packageExtra = sp.getPricePerCycle(); // รายครั้งบวกเพิ่ม
            }
        }

        sr.setBasePrice(basePrice);

        boolean isMonthlyPackage = sr.getServicePackage() != null
                && "Monthly".equalsIgnoreCase(sr.getServicePackage().getSubscriptionType());
        int count = isMonthlyPackage
                ? 30
                : ((request.getService_count() != null && request.getService_count() > 0) ? request.getService_count() : 1);
        sr.setServiceCount(count);
        sr.setRemainingServiceCount(count);

        Double calculatedUnit = basePrice + packageExtra;
        Double serviceTotal = isMonthlyPackage ? basePrice : calculatedUnit * count;
        // ไม่คิดค่าเดินทาง: ยอดรวมเป็นค่าบริการจากแพ็กเกจเท่านั้น
        sr.setTotalPrice(serviceTotal);

        // Nurse
        if (request.getNurse_id() != null && !request.getNurse_id().isEmpty()) {
            Nurse nurse = nurseRepository.findById(request.getNurse_id()).orElse(null);
            if (nurse == null || !"Verified".equalsIgnoreCase(nurse.getApprovalStatus())
                    || nurse.getUser() == null || !"Active".equalsIgnoreCase(nurse.getUser().getStatus())) {
                throw new RuntimeException("พยาบาลท่านนี้ไม่พร้อมให้บริการ");
            }

            // 1. ตรวจสอบวันหมดอายุใบอนุญาตของพยาบาล (ต้องยังไม่หมดอายุ และครอบคลุมจนถึงวันสิ้นสุดการรับบริการ)
            if (nurse.getLicenseExpireDate() != null) {
                if (nurse.getLicenseExpireDate().isBefore(java.time.LocalDate.now())) {
                    throw new RuntimeException("ใบอนุญาตประกอบวิชาชีพของพยาบาลท่านนี้หมดอายุแล้ว ไม่สามารถรับงานได้");
                }
                if (incomingEnd.isAfter(nurse.getLicenseExpireDate())
                        || requestedDates.stream().anyMatch(d -> d.isAfter(nurse.getLicenseExpireDate()))) {
                    throw new RuntimeException("ไม่สามารถขอรับบริการได้ เนื่องจากวันที่รับบริการ (ถึงวันที่ " + incomingEnd + ") เกินวันหมดอายุใบอนุญาตประกอบวิชาชีพของพยาบาล (หมดอายุวันที่ " + nurse.getLicenseExpireDate() + ") กรุณาเลือกพยาบาลท่านอื่นหรือปรับลดช่วงวันรับบริการ");
                }
            }

            // 2. ตรวจสอบเงื่อนไขแพ็กเกจรายเดือน: สงวนสิทธิ์สำหรับพยาบาลเกษียณอายุราชการเท่านั้น
            if (isMonthlyPackage && !Boolean.TRUE.equals(nurse.getRetired())) {
                throw new RuntimeException("แพ็กเกจเหมาจ่ายรายเดือนสงวนสิทธิ์สำหรับพยาบาลเกษียณอายุราชการเท่านั้น");
            }

            shiftMatchingService.validateRoster(nurse, requestedDates, request.getTime_slot());

            Map<String, Object> clinicalAssessment = clinicalMatchingService.assessHealthProfile(
                    healthProfileRepository.findByPatient_Id(patient.getId()).orElse(null));
            String requiredTier = String.valueOf(clinicalAssessment.get("tier"));
            String nurseTier = nurse.getProfessionalTier() != null ? nurse.getProfessionalTier().toUpperCase() : "CG";
            boolean tierAllowed = "CG".equals(requiredTier)
                    || ("PN".equals(requiredTier) && ("PN".equals(nurseTier) || "RN".equals(nurseTier)))
                    || ("RN".equals(requiredTier) && "RN".equals(nurseTier));
            if (!tierAllowed) {
                throw new RuntimeException("ระดับวิชาชีพของพยาบาลไม่ตรงกับความต้องการของผู้ป่วย (ต้องใช้ " + requiredTier + ")");
            }

            // 2. ตรวจสอบระดับวิชาชีพสำหรับงานเฉพาะทาง/หัตถการ
            boolean isComplex = request.getIs_complex_wound() != null ? request.getIs_complex_wound() : false;
            boolean requiresLicense = sp != null && sp.getServiceCategory() != null &&
                    ("RN".equalsIgnoreCase(sp.getServiceCategory().getRequiredCertification()) || Boolean.TRUE.equals(sp.getServiceCategory().getIsSpecialized()));

            if ((requiresLicense || isComplex) && !"RN".equalsIgnoreCase(nurse.getProfessionalTier())) {
                throw new RuntimeException("บริการนี้สงวนสิทธิ์สำหรับพยาบาลวิชาชีพ (RN) เท่านั้น");
            }


            // 4. ตรวจสอบตารางงานซ้ำซ้อนของพยาบาลด้วยช่วงวันที่จริง
            if (request.getStart_date() != null) {
                for (ServiceRequest existing : serviceRequestRepository.findAll()) {
                    boolean isAssigned = (existing.getNurse() != null && existing.getNurse().getId().equals(nurse.getId()));
                    if (!isAssigned || !isActiveBooking(existing.getStatus())) {
                        continue;
                    }

                    boolean isExistingMonthly = isMonthlySubscription(existing);
                    java.time.LocalDate existingStart = parseStartDate(existing.getStartDate());
                    List<LocalDate> existingDates = getStoredDates(existing);
                    java.time.LocalDate existingEnd = getEffectiveEndDate(existing);

                    boolean datesOverlap = !existingDates.isEmpty()
                            ? existingDates.stream().anyMatch(requestedDates::contains)
                            : existingStart != null && existingEnd != null
                            && dateRangesOverlap(incomingStart, incomingEnd, existingStart, existingEnd);

                    if (datesOverlap) {
                        if (isIncomingMonthly) {
                            throw new RuntimeException("พยาบาลท่านนี้มีนัดหมายบริการแล้วในช่วงวันที่เลือก ไม่สามารถรับงานเหมาจ่ายรายเดือนได้");
                        }
                        if (isExistingMonthly) {
                            throw new RuntimeException("พยาบาลท่านนี้ติดสัญญาเหมาจ่ายรายเดือนในช่วงเวลาดังกล่าว ไม่สามารถรับงานเพิ่มได้");
                        }
                        // ทั้งสองเป็นงานรายครั้ง/รายกะ ตรวจสอบว่ากะเวลาตรงกันหรือไม่
                        if (request.getTime_slot() != null && existing.getTimeSlot() != null
                                && request.getTime_slot().equalsIgnoreCase(existing.getTimeSlot())) {
                            throw new RuntimeException("พยาบาลท่านนี้มีนัดหมายบริการในช่วงวันที่ทับซ้อนกันและช่วงเวลาเดียวกันแล้ว กรุณาเลือกช่วงเวลาอื่น");
                        }
                    }
                }
            }

            sr.setNurse(nurse);
        }

        sr.setStartDate(request.getStart_date());
        sr.setEndDate(request.getEnd_date());
        sr.setServiceDates(requestedDates.stream().map(LocalDate::toString).collect(Collectors.joining(",")));
        sr.setTimeSlot(request.getTime_slot());
        sr.setServiceAddress(request.getService_address());
        sr.setStatus("Pending");
        sr.setPaymentStatus("Unpaid");
        sr.setSpecialPrecautions(request.getSpecial_precautions());
        sr.setAdditionalNotes(request.getAdditional_notes());
        sr.setIsComplexWound(request.getIs_complex_wound() != null ? request.getIs_complex_wound() : false);
        sr.setWoundPhotoUrl(request.getWound_photo_url());
        sr.setLatitude(request.getLatitude());
        sr.setLongitude(request.getLongitude());

        sr = serviceRequestRepository.save(sr);
        return Map.of("id", sr.getId(), "total_price", sr.getTotalPrice(), "message", "ส่งคำขอรับบริการสำเร็จ");
    }

    @Override
    public List<Map<String, Object>> listMyServiceRequests(String userId) {
        Member member = getMember(userId);
        return serviceRequestRepository.findAll().stream()
            .filter(sr -> sr.getPatient().getMember().getId().equals(member.getId()))
            .map(sr -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", sr.getId());
                map.put("status", sr.getStatus());
                map.put("patient_name", sr.getPatient().getFirstname() + " " + sr.getPatient().getLastname());
                map.put("start_date", sr.getStartDate() != null ? sr.getStartDate().toString() : "");
                map.put("end_date", sr.getEndDate() != null ? sr.getEndDate().toString() : "");
                map.put("time_slot", sr.getTimeSlot());
                if (sr.getNurse() != null) map.put("nurse_name", sr.getNurse().getFullname() + " " + sr.getNurse().getSurname());
                map.put("total_price", sr.getTotalPrice());
                map.put("service_total", sr.getTotalPrice());
                int totalVisits = sr.getServiceCount() != null ? sr.getServiceCount() : 1;
                int remainingVisits = sr.getRemainingServiceCount() != null ? sr.getRemainingServiceCount() : totalVisits;
                map.put("service_count", totalVisits);
                map.put("remaining_service_count", remainingVisits);
                map.put("completed_service_count", Math.max(0, totalVisits - remainingVisits));
                map.put("package_name", sr.getServicePackage() != null ? sr.getServicePackage().getPackageName() : "รายครั้ง");
                map.put("subscription_type", sr.getServicePackage() != null ? sr.getServicePackage().getSubscriptionType() : "Per Cycle");
                map.put("additional_notes", sr.getAdditionalNotes());
                return map;
            }).collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getServiceDetail(String userId, String requestId) {
        ServiceRequest sr = serviceRequestRepository.findById(requestId).orElseThrow(() -> new RuntimeException("ไม่พบคำขอรับบริการ"));

        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("ไม่พบบัญชีผู้ใช้"));
        boolean isOwner = sr.getPatient().getMember().getUser().getId().equals(userId);
        boolean isAssignedNurse = (sr.getNurse() != null && sr.getNurse().getUser().getId().equals(userId));
        boolean isAdmin = "admin".equalsIgnoreCase(user.getRole());

        if (!isOwner && !isAssignedNurse && !isAdmin) {
            throw new RuntimeException("คุณไม่มีสิทธิ์เข้าถึงคำขอนี้");
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", sr.getId());
        map.put("status", sr.getStatus());
        map.put("patient_id", sr.getPatient().getId());
        map.put("patient_name", sr.getPatient().getFirstname() + " " + sr.getPatient().getLastname());
        map.put("patient_first_name", sr.getPatient().getFirstname());
        map.put("patient_last_name", sr.getPatient().getLastname());
        map.put("patient_age", sr.getPatient().getAge());
        map.put("patient_gender", sr.getPatient().getGender());
        map.put("birth_date", sr.getPatient().getBirthDate() != null ? sr.getPatient().getBirthDate().toString() : "");
        map.put("religion", sr.getPatient().getReligion());
        map.put("primary_language", sr.getPatient().getPrimaryLanguage());
        map.put("relationship_to_member", sr.getPatient().getRelationshipToMember());
        map.put("emergency_contact_name", sr.getPatient().getEmergencyContactName());
        map.put("emergency_contact_phone", sr.getPatient().getEmergencyPhone());
        map.put("emergency_contact_relationship", sr.getPatient().getEmergencyRelationship());
        map.put("service_type_name", sr.getServiceTypeName());
        map.put("service_type_id", sr.getServicePackage() != null && sr.getServicePackage().getServiceCategory() != null ? sr.getServicePackage().getServiceCategory().getId() : "");
        map.put("start_date", sr.getStartDate() != null ? sr.getStartDate().toString() : "");
        map.put("end_date", sr.getEndDate() != null ? sr.getEndDate().toString() : "");
        map.put("time_slot", sr.getTimeSlot());
        map.put("service_address", sr.getServiceAddress());
        int totalVisits = sr.getServiceCount() != null ? sr.getServiceCount() : 1;
        int remainingVisits = sr.getRemainingServiceCount() != null ? sr.getRemainingServiceCount() : totalVisits;
        map.put("service_count", totalVisits);
        map.put("remaining_service_count", remainingVisits);
        map.put("completed_service_count", Math.max(0, totalVisits - remainingVisits));
        map.put("package_name", sr.getServicePackage() != null ? sr.getServicePackage().getPackageName() : "รายครั้ง");
        map.put("subscription_type", sr.getServicePackage() != null ? sr.getServicePackage().getSubscriptionType() : "Per Cycle");
        if (sr.getNurse() != null) {
            map.put("nurse_id", sr.getNurse().getId());
            map.put("nurse_name", sr.getNurse().getFullname() + " " + sr.getNurse().getSurname());
            map.put("nurse_tier", sr.getNurse().getProfessionalTier());
            map.put("nurse_license_no", sr.getNurse().getLicenseNumber());
            map.put("nurse_phone", sr.getNurse().getPhoneNumber());
        }
        map.put("total_price", sr.getTotalPrice());
        map.put("service_total", sr.getTotalPrice());
        map.put("base_price", sr.getBasePrice());
        map.put("additional_notes", sr.getAdditionalNotes());
        map.put("special_precautions", sr.getSpecialPrecautions());
        map.put("is_complex_wound", sr.getIsComplexWound());
        map.put("wound_photo_url", sr.getWoundPhotoUrl());
        map.put("latitude", sr.getLatitude());
        map.put("longitude", sr.getLongitude());

        healthProfileRepository.findByPatient_Id(sr.getPatient().getId()).ifPresent(hp -> {
            map.put("blood_type", hp.getBloodType());
            map.put("congenital_disease", hp.getCongenitalDisease());
            map.put("food_allergy", hp.getFoodAllergy());
            map.put("drug_allergy", hp.getDrugAllergy());
            map.put("dietary_restrictions", hp.getDietaryRestrictions());
            map.put("consciousness", hp.getConsciousness());
            map.put("vision_ability", hp.getVisionAbility());
            map.put("hearing_ability", hp.getHearingAbility());
            map.put("adl_score", hp.getAdlScore());
            map.put("elimination", hp.getElimination());
            map.put("laxative_use", hp.getLaxativeUse());
            map.put("mood", hp.getMood());
            map.put("current_assistance", hp.getCurrentAssistance());
            map.put("chief_complaint", hp.getChiefComplaint());
        });

        List<CareRecords> careRecords = careRecordRepository.findByServiceRequest_IdOrderByVisitDateDesc(requestId);
        List<Map<String, Object>> careRecordMaps = careRecords.stream().map(cr -> {
            Map<String, Object> careMap = new HashMap<>();
            careMap.put("id", cr.getId());
            careMap.put("visit_date", cr.getVisitDate() != null ? cr.getVisitDate().toString() : null);
            careMap.put("check_in_time", cr.getCheckInTime() != null ? cr.getCheckInTime().toString() : null);
            careMap.put("check_out_time", cr.getCheckOutTime() != null ? cr.getCheckOutTime().toString() : null);
            careMap.put("blood_pressure", cr.getBloodPressure());
            careMap.put("heart_rate", cr.getHeartRate());
            careMap.put("temperature", cr.getBodyTemperature());
            careMap.put("respiratory_rate", cr.getRespiratoryRate());
            careMap.put("oxygen_saturation", cr.getOxygenSaturation());
            careMap.put("pain_score", cr.getPainScore());
            careMap.put("pain_location", cr.getPainLocation());
            careMap.put("consciousness", cr.getConsciousness());
            careMap.put("weight", cr.getWeight());
            careMap.put("excretion", cr.getExcretion());
            careMap.put("patient_condition", cr.getPatientCondition());
            careMap.put("care_given", cr.getCareGiven());
            careMap.put("nursing_notes", cr.getSymptomSummary());
            careMap.put("medication", cr.getMedicationRecord());
            careMap.put("follow_up_date", cr.getFollowUpDate() != null ? cr.getFollowUpDate().toString() : null);
            careMap.put("care_image_url", cr.getCareImageUrl());
            return careMap;
        }).collect(Collectors.toList());
        map.put("care_records", careRecordMaps);
        // รองรับข้อมูลเดิมที่หน้าเว็บอาจยังอ่านชื่อ care_record อยู่
        if (!careRecordMaps.isEmpty()) map.put("care_record", careRecordMaps.get(0));

        return map;
    }

    @Override
    @Transactional
    public Map<String, Object> payForService(String userId, String requestId, MultipartFile slipFile) {
        ServiceRequest sr = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("ไม่พบคำขอรับบริการ"));
        Member member = getMember(userId);
        checkOwnership(sr, member);

        if (!"Accepted".equalsIgnoreCase(sr.getStatus())) {
            if ("Paid".equalsIgnoreCase(sr.getStatus()) || "Paid".equalsIgnoreCase(sr.getPaymentStatus())) {
                throw new RuntimeException("คำขอนี้ชำระเงินเรียบร้อยแล้ว");
            } else if ("Rejected".equalsIgnoreCase(sr.getStatus())) {
                throw new RuntimeException("คำขอนี้ถูกปฏิเสธโดยพยาบาลแล้ว ไม่สามารถชำระเงินได้");
            } else if ("Cancelled".equalsIgnoreCase(sr.getStatus())) {
                throw new RuntimeException("คำขอนี้ถูกยกเลิกแล้ว ไม่สามารถชำระเงินได้");
            } else {
                throw new RuntimeException("สามารถชำระเงินได้เฉพาะคำขอที่พยาบาลตอบรับงานแล้ว (Accepted) เท่านั้น");
            }
        }
        if ("Paid".equals(sr.getPaymentStatus())) {
            throw new RuntimeException("คำขอนี้ชำระเงินไปแล้ว");
        }
        if (sr.getTotalPrice() == null || sr.getTotalPrice() <= 0) {
            throw new RuntimeException("ไม่พบยอดค่าบริการที่ถูกต้อง");
        }

        SlipVerificationService.VerifyResult verification = slipVerificationService.verifySlip(slipFile, sr.getTotalPrice());
        String transRef = verification.getTransRef();
        if (transRef == null || transRef.isBlank()) {
            throw new RuntimeException("ระบบตรวจสอบสลิปไม่พบเลขอ้างอิงรายการ");
        }
        if (serviceRequestRepository.existsBySlipTransRef(transRef)) {
            throw new RuntimeException("สลิปนี้ถูกบันทึกในระบบแล้ว ไม่สามารถใช้ซ้ำได้");
        }

        sr.setStatus("Paid");
        sr.setPaymentStatus("Paid");
        sr.setSlipTransRef(transRef);
        sr.setPaidAt(java.time.LocalDateTime.now());

        Payment payment = sr.getPayment();
        if (payment != null) {
            payment.setTransactionId(transRef);
            payment.setTotalAmount(verification.getAmount());
            payment.processPayment();
            Receipt receipt = payment.getReceipt();
            if (receipt == null) {
                receipt = new Receipt();
                receipt.setId("RC-" + sr.getId().substring(0, 8).toUpperCase());
                receipt.setPayment(payment);
                payment.setReceipt(receipt);
            }
            receipt.setFinalAmount(verification.getAmount());
            receipt.setIssueDate(java.time.LocalDate.now());
            receipt.setServiceDescription(sr.getServiceTypeName());
        }

        serviceRequestRepository.save(sr);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "ชำระเงินสำเร็จ");
        response.put("trans_ref", transRef);
        response.put("amount", verification.getAmount());
        return response;
    }

    @Override
    public Map<String, Object> getReceipt(String userId, String requestId) {
        ServiceRequest sr = serviceRequestRepository.findById(requestId).orElseThrow(() -> new RuntimeException("ไม่พบคำขอรับบริการ"));
        Member member = getMember(userId);
        checkOwnership(sr, member);
        if (!"Paid".equals(sr.getStatus()) && !"InProgress".equals(sr.getStatus()) && !"Completed".equals(sr.getStatus())) {
            throw new RuntimeException("ยังไม่ได้ชำระเงิน ไม่สามารถดูใบเสร็จได้");
        }

        Map<String, Object> map = new HashMap<>();
        map.put("receipt_id", "RC-" + sr.getId().substring(0, 8).toUpperCase());
        map.put("payment_date", sr.getPaidAt() != null ? sr.getPaidAt().toLocalDate().toString() : java.time.LocalDate.now().toString());
        map.put("slip_trans_ref", sr.getSlipTransRef());
        map.put("patient_name", sr.getPatient().getFirstname() + " " + sr.getPatient().getLastname());
        if (sr.getNurse() != null) map.put("nurse_name", sr.getNurse().getFullname() + " " + sr.getNurse().getSurname());
        map.put("service_type", sr.getServiceTypeName());
        map.put("service_date", sr.getStartDate() != null ? sr.getStartDate().toString() : "");
        map.put("time_slot", sr.getTimeSlot());
        map.put("base_price", sr.getBasePrice() != null ? sr.getBasePrice() : 0.0);
        map.put("total_price", sr.getTotalPrice() != null ? sr.getTotalPrice() : 0.0);
        return map;
    }

    @Override
    @Transactional
    public void cancelServiceRequest(String userId, String requestId) {
        ServiceRequest sr = serviceRequestRepository.findById(requestId).orElseThrow(() -> new RuntimeException("ไม่พบคำขอรับบริการ"));
        Member member = getMember(userId);
        checkOwnership(sr, member);

        String currentStatus = sr.getStatus();
        if (!Arrays.asList("Pending", "Accepted").contains(currentStatus)) {
            throw new RuntimeException("คำขอนี้ไม่อยู่ในสถานะที่สามารถยกเลิกได้");
        }
        if ("Paid".equalsIgnoreCase(sr.getPaymentStatus()) || "Paid".equalsIgnoreCase(currentStatus)) {
            throw new RuntimeException("คำขอที่ชำระเงินแล้วต้องผ่านขั้นตอนขอคืนเงินกับผู้ดูแลระบบ");
        }

        sr.setStatus("Cancelled");
        serviceRequestRepository.save(sr);
    }
}
