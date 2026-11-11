package com.nursingcare.backend.service.impl;
import com.nursingcare.backend.dto.request.PatientRequestDto;
import com.nursingcare.backend.entity.HealthProfile;
import com.nursingcare.backend.entity.Member;
import com.nursingcare.backend.entity.Patient;
import com.nursingcare.backend.repository.HealthProfileRepository;
import com.nursingcare.backend.repository.MemberRepository;
import com.nursingcare.backend.repository.PatientRepository;
import com.nursingcare.backend.repository.ServiceRequestRepository;
import com.nursingcare.backend.service.PatientService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PatientServiceImpl implements PatientService {
    private final PatientRepository patientRepository;
    private final MemberRepository memberRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final ServiceRequestRepository serviceRequestRepository;

    public PatientServiceImpl(PatientRepository patientRepository, MemberRepository memberRepository, HealthProfileRepository healthProfileRepository, ServiceRequestRepository serviceRequestRepository) {
        this.patientRepository = patientRepository;
        this.memberRepository = memberRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.serviceRequestRepository = serviceRequestRepository;
    }

    private Member getMember(String userId) {
        return memberRepository.findByUser_Id(userId).orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลสมาชิก"));
    }

    @Override
    @Transactional
    public Map<String, Object> addPatient(String userId, PatientRequestDto request) {
        Member member = getMember(userId);
        Patient patient = new Patient();
        patient.setId(UUID.randomUUID().toString());
        patient.setMember(member);
        patient.setFirstname(request.getFirst_name());
        patient.setLastname(request.getLast_name());
        patient.setGender(request.getGender());
        patient.setBirthDate(request.getBirth_date());
        if (request.getAge() != null) {
            patient.setAge(request.getAge());
        } else if (request.getBirth_date() != null) {
            patient.setAge(java.time.Period.between(request.getBirth_date(), java.time.LocalDate.now()).getYears());
        }
        patient.setReligion(request.getReligion());
        patient.setPrimaryLanguage(request.getMain_language());
        patient.setRelationshipToMember(request.getRelationship_to_member());
        patient.setEmergencyContactName(request.getEmergency_contact_name());
        patient.setEmergencyPhone(request.getEmergency_contact_phone());
        patient.setEmergencyRelationship(request.getEmergency_contact_relationship());
        patient = patientRepository.save(patient);

        if (request.getHealth_profile() != null) {
            HealthProfile hp = new HealthProfile();
            hp.setId(UUID.randomUUID().toString());
            hp.setPatient(patient);
            mapHealthProfile(hp, request.getHealth_profile());
            healthProfileRepository.save(hp);
        }
        return Map.of("id", patient.getId(), "message", "เพิ่มข้อมูลผู้ป่วยสำเร็จ");
    }

    @Override
    public List<Map<String, Object>> listPatients(String userId) {
        Member member = getMember(userId);
        // We might not have findByMemberIdOrderByIdDesc anymore since String ID, but let's assume it maps or we use findAll
        // Simulating the list logic 
        return patientRepository.findAll().stream().filter(p -> p.getMember().getId().equals(member.getId())).map(this::mapPatientToDto).collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getPatient(String userId, String patientId) {
        Member member = getMember(userId);
        Patient patient = patientRepository.findById(patientId).filter(p -> p.getMember().getId().equals(member.getId())).orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลผู้ป่วย"));
        Map<String, Object> dto = mapPatientToDto(patient);
        healthProfileRepository.findAll().stream().filter(hp -> hp.getPatient().getId().equals(patientId)).findFirst().ifPresent(hp -> dto.put("health_profile", mapHealthProfileToDto(hp)));
        return dto;
    }

    @Override
    @Transactional
    public void editPatient(String userId, String patientId, PatientRequestDto request) {
        Member member = getMember(userId);
        Patient patient = patientRepository.findById(patientId).filter(p -> p.getMember().getId().equals(member.getId())).orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลผู้ป่วย"));
        if (request.getFirst_name() != null) patient.setFirstname(request.getFirst_name());
        if (request.getLast_name() != null) patient.setLastname(request.getLast_name());
        if (request.getGender() != null) patient.setGender(request.getGender());
        if (request.getBirth_date() != null) {
            patient.setBirthDate(request.getBirth_date());
            if (request.getAge() == null) {
                patient.setAge(java.time.Period.between(request.getBirth_date(), java.time.LocalDate.now()).getYears());
            }
        }
        if (request.getAge() != null) patient.setAge(request.getAge());
        if (request.getReligion() != null) patient.setReligion(request.getReligion());
        if (request.getMain_language() != null) patient.setPrimaryLanguage(request.getMain_language());
        if (request.getRelationship_to_member() != null) patient.setRelationshipToMember(request.getRelationship_to_member());
        if (request.getEmergency_contact_name() != null) patient.setEmergencyContactName(request.getEmergency_contact_name());
        if (request.getEmergency_contact_phone() != null) patient.setEmergencyPhone(request.getEmergency_contact_phone());
        if (request.getEmergency_contact_relationship() != null) patient.setEmergencyRelationship(request.getEmergency_contact_relationship());
        if (request.getStatus() != null) {
            String status = request.getStatus().trim().toUpperCase();
            if (!status.equals("ACTIVE") && !status.equals("INACTIVE")) throw new RuntimeException("สถานะผู้ป่วยไม่ถูกต้อง");
            patient.setStatus(status);
        }
        patientRepository.save(patient);

        if (request.getHealth_profile() != null) {
            HealthProfile hp = healthProfileRepository.findAll().stream().filter(h -> h.getPatient().getId().equals(patientId)).findFirst().orElse(new HealthProfile());
            if (hp.getId() == null) hp.setId(UUID.randomUUID().toString());
            hp.setPatient(patient);
            mapHealthProfile(hp, request.getHealth_profile());
            healthProfileRepository.save(hp);
        }
    }

    @Override
    @Transactional
    public void updatePatientStatus(String userId, String patientId, String status) {
        Member member = getMember(userId);
        Patient patient = patientRepository.findById(patientId)
                .filter(p -> p.getMember().getId().equals(member.getId()))
                .orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลผู้ป่วย หรือคุณไม่มีสิทธิ์เข้าถึง"));

        String targetStatus = status != null ? status.trim().toUpperCase() : "ACTIVE";
        if (!targetStatus.equals("ACTIVE") && !targetStatus.equals("INACTIVE")) {
            throw new RuntimeException("สถานะไม่ถูกต้อง (ต้องเป็น ACTIVE หรือ INACTIVE)");
        }

        // ข้อ 5: ตรวจสอบว่าถ้ายังรับบริการอยู่ (Pending, Accepted, Paid, InProgress) ห้ามกดพักการดูแล
        if (targetStatus.equals("INACTIVE")) {
            boolean hasActiveRequests = serviceRequestRepository.findAll().stream()
                    .filter(sr -> sr.getPatient().getId().equals(patientId))
                    .anyMatch(sr -> {
                        String st = sr.getStatus();
                        return "Pending".equalsIgnoreCase(st) || "Accepted".equalsIgnoreCase(st)
                                || "Paid".equalsIgnoreCase(st) || "InProgress".equalsIgnoreCase(st);
                    });
            if (hasActiveRequests) {
                throw new RuntimeException("ไม่สามารถพักการดูแลได้ เนื่องจากผู้ป่วยยังมีรายการบริการที่กำลังดำเนินการอยู่ กรุณารอให้การดูแลเสร็จสิ้นหรือยกเลิกคำขอก่อน");
            }
        }

        patient.setStatus(targetStatus);
        patientRepository.save(patient);
    }

    @Override
    @Transactional
    public void deletePatient(String userId, String patientId) {
        Member member = getMember(userId);
        Patient patient = patientRepository.findById(patientId).filter(p -> p.getMember().getId().equals(member.getId())).orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลผู้ป่วย หรือคุณไม่มีสิทธิ์ลบข้อมูลนี้"));
        
        // ใช้เกณฑ์มาตรฐานเดียวกัน: ห้ามลบหากยังมีรายการบริการที่ยังไม่เสร็จสิ้น (Pending, Accepted, Paid, InProgress)
        long activeCount = serviceRequestRepository.findAll().stream()
            .filter(sr -> sr.getPatient().getId().equals(patientId))
            .filter(sr -> {
                String status = sr.getStatus();
                return "Pending".equalsIgnoreCase(status) || "Accepted".equalsIgnoreCase(status)
                        || "Paid".equalsIgnoreCase(status) || "InProgress".equalsIgnoreCase(status);
            })
            .count();

        if (activeCount > 0) throw new RuntimeException("ไม่สามารถลบข้อมูลผู้ป่วยได้ เนื่องจากยังมีรายการบริการที่กำลังดำเนินการอยู่ กรุณารอให้บริการเสร็จสิ้นหรือยกเลิกคำขอก่อน");
        try {
            healthProfileRepository.findAll().stream().filter(hp -> hp.getPatient().getId().equals(patientId)).forEach(healthProfileRepository::delete);
            patientRepository.delete(patient);
        } catch (Exception e) {
            throw new RuntimeException("ไม่สามารถลบผู้ป่วยได้");
        }
    }

    private void mapHealthProfile(HealthProfile hp, Map<String, Object> reqHp) {
        if (reqHp.containsKey("blood_type")) hp.setBloodType((String) reqHp.get("blood_type"));
        if (reqHp.containsKey("congenital_disease")) hp.setCongenitalDisease((String) reqHp.get("congenital_disease"));
        if (reqHp.containsKey("consciousness")) hp.setConsciousness((String) reqHp.get("consciousness"));
        if (reqHp.containsKey("chief_complaint")) hp.setChiefComplaint((String) reqHp.get("chief_complaint"));
        if (reqHp.containsKey("current_assistance")) hp.setCurrentAssistance((String) reqHp.get("current_assistance"));
        if (reqHp.containsKey("adl_score")) hp.setAdlScore((String) reqHp.get("adl_score"));
        if (reqHp.containsKey("elimination")) hp.setElimination((String) reqHp.get("elimination"));
        if (reqHp.containsKey("laxative_use")) hp.setLaxativeUse((String) reqHp.get("laxative_use"));
        if (reqHp.containsKey("hearing")) hp.setHearingAbility((String) reqHp.get("hearing"));
        if (reqHp.containsKey("vision")) hp.setVisionAbility((String) reqHp.get("vision"));
        if (reqHp.containsKey("mood")) hp.setMood((String) reqHp.get("mood"));
        if (reqHp.containsKey("food_allergy")) hp.setFoodAllergy((String) reqHp.get("food_allergy"));
        if (reqHp.containsKey("drug_allergy")) hp.setDrugAllergy((String) reqHp.get("drug_allergy"));
        if (reqHp.containsKey("dietary_restrictions")) hp.setDietaryRestrictions((String) reqHp.get("dietary_restrictions"));
    }

    private Map<String, Object> mapPatientToDto(Patient p) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", p.getId());
        map.put("member_id", p.getMember().getId());
        map.put("first_name", p.getFirstname());
        map.put("last_name", p.getLastname());
        map.put("gender", p.getGender());
        map.put("birth_date", p.getBirthDate() != null ? p.getBirthDate().toString() : null);
        map.put("age", p.getAge());
        map.put("relationship_to_member", p.getRelationshipToMember());
        map.put("religion", p.getReligion());
        map.put("main_language", p.getPrimaryLanguage());
        map.put("emergency_contact_name", p.getEmergencyContactName());
        map.put("emergency_contact_phone", p.getEmergencyPhone());
        map.put("emergency_contact_relationship", p.getEmergencyRelationship());
        map.put("status", p.getStatus());
        healthProfileRepository.findAll().stream()
                .filter(hp -> hp.getPatient().getId().equals(p.getId()))
                .findFirst()
                .ifPresent(hp -> map.put("health_profile", mapHealthProfileToDto(hp)));
        return map;
    }

    private Map<String, Object> mapHealthProfileToDto(HealthProfile hp) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", hp.getId());
        map.put("blood_type", hp.getBloodType());
        map.put("congenital_disease", hp.getCongenitalDisease());
        map.put("consciousness", hp.getConsciousness());
        map.put("chief_complaint", hp.getChiefComplaint());
        map.put("current_assistance", hp.getCurrentAssistance());
        map.put("adl_score", hp.getAdlScore());
        map.put("elimination", hp.getElimination());
        map.put("laxative_use", hp.getLaxativeUse());
        map.put("hearing", hp.getHearingAbility());
        map.put("vision", hp.getVisionAbility());
        map.put("mood", hp.getMood());
        map.put("food_allergy", hp.getFoodAllergy());
        map.put("drug_allergy", hp.getDrugAllergy());
        map.put("dietary_restrictions", hp.getDietaryRestrictions());
        return map;
    }
}