package com.nursingcare.backend.controller;

import com.nursingcare.backend.dto.request.PatientRequestDto;
import com.nursingcare.backend.security.UserPrincipal;
import com.nursingcare.backend.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/member/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @PostMapping
    public ResponseEntity<?> addPatient(@AuthenticationPrincipal UserPrincipal principal,
                                        @Valid @RequestBody PatientRequestDto request) {
        try {
            Map<String, Object> response = patientService.addPatient(principal.getId(), request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping
    public ResponseEntity<?> listPatients(@AuthenticationPrincipal UserPrincipal principal) {
        try {
            List<Map<String, Object>> patients = patientService.listPatients(principal.getId());
            return ResponseEntity.ok(patients);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/{patientId}")
    public ResponseEntity<?> getPatient(@AuthenticationPrincipal UserPrincipal principal,
                                        @PathVariable String patientId) {
        try {
            Map<String, Object> patient = patientService.getPatient(principal.getId(), patientId);
            return ResponseEntity.ok(patient);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/{patientId}")
    public ResponseEntity<?> editPatient(@AuthenticationPrincipal UserPrincipal principal,
                                         @PathVariable String patientId,
                                         @Valid @RequestBody PatientRequestDto request) {
        try {
            patientService.editPatient(principal.getId(), patientId, request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "อัพเดทข้อมูลผู้ป่วยสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/{patientId}/status")
    public ResponseEntity<?> updatePatientStatus(@AuthenticationPrincipal UserPrincipal principal,
                                                  @PathVariable String patientId,
                                                  @RequestBody Map<String, String> payload) {
        try {
            patientService.updatePatientStatus(principal.getId(), patientId, payload.get("status"));
            Map<String, String> response = new HashMap<>();
            response.put("message", "อัปเดตสถานะผู้ป่วยสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @DeleteMapping("/{patientId}")
    public ResponseEntity<?> deletePatient(@AuthenticationPrincipal UserPrincipal principal,
                                           @PathVariable String patientId) {
        try {
            patientService.deletePatient(principal.getId(), patientId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "ลบข้อมูลผู้ป่วยสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
