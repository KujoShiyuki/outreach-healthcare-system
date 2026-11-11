package com.nursingcare.backend.controller;

import com.nursingcare.backend.entity.HealthProfile;
import com.nursingcare.backend.repository.HealthProfileRepository;
import com.nursingcare.backend.repository.MemberRepository;
import com.nursingcare.backend.repository.PatientRepository;
import com.nursingcare.backend.security.UserPrincipal;
import com.nursingcare.backend.service.ClinicalMatchingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/member/patients")
public class ClinicalMatchingController {
    private final PatientRepository patientRepository;
    private final MemberRepository memberRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final ClinicalMatchingService clinicalMatchingService;

    public ClinicalMatchingController(PatientRepository patientRepository,
                                      MemberRepository memberRepository,
                                      HealthProfileRepository healthProfileRepository,
                                      ClinicalMatchingService clinicalMatchingService) {
        this.patientRepository = patientRepository;
        this.memberRepository = memberRepository;
        this.healthProfileRepository = healthProfileRepository;
        this.clinicalMatchingService = clinicalMatchingService;
    }

    @GetMapping("/{patientId}/clinical-assessment")
    public ResponseEntity<?> assessPatient(@AuthenticationPrincipal UserPrincipal principal,
                                           @PathVariable String patientId) {
        if (principal == null || principal.getId() == null || principal.getId().isBlank()) {
            throw new RuntimeException("ไม่พบข้อมูลผู้ใช้งาน");
        }
        String userId = principal.getId();
        var member = memberRepository.findByUser_Id(userId)
                .orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลสมาชิก"));
        var patient = patientRepository.findById(patientId)
                .filter(item -> item.getMember().getId().equals(member.getId()))
                .orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลผู้ป่วย หรือคุณไม่มีสิทธิ์เข้าถึง"));
        HealthProfile profile = healthProfileRepository.findByPatient_Id(patient.getId()).orElse(null);

        Map<String, Object> response = new HashMap<>(clinicalMatchingService.assessHealthProfile(profile));
        response.put("patient_id", patient.getId());
        return ResponseEntity.ok(response);
    }
}
