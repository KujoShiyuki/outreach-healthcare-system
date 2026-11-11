package com.nursingcare.backend.controller;

import com.nursingcare.backend.dto.request.CareRecordDto;
import com.nursingcare.backend.dto.request.WithdrawRequestDto;
import com.nursingcare.backend.security.UserPrincipal;
import com.nursingcare.backend.service.NurseService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/nurses")
public class NurseController {

    private final NurseService nurseService;

    public NurseController(NurseService nurseService) {
        this.nurseService = nurseService;
    }

    @GetMapping("/public-search")
    public ResponseEntity<?> publicSearchNurses(
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) Boolean is_specialist,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) Boolean is_retired) {
        try {
            List<Map<String, Object>> nurses = nurseService.publicSearchNurses(area, specialty, is_specialist, tier, is_retired);
            return ResponseEntity.ok(nurses);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal UserPrincipal principal) {
        try {
            Map<String, Object> profile = nurseService.getNurseProfile(principal.getId());
            return ResponseEntity.ok(profile);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@AuthenticationPrincipal UserPrincipal principal,
                                           @RequestBody Map<String, Object> updates) {
        try {
            nurseService.updateNurseProfile(principal.getId(), updates);
            Map<String, String> response = new HashMap<>();
            response.put("message", "แก้ไขข้อมูลส่วนตัวสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/requests")
    public ResponseEntity<?> getNurseRequests(@AuthenticationPrincipal UserPrincipal principal) {
        try {
            Map<String, List<Map<String, Object>>> requests = nurseService.getNurseRequests(principal.getId());
            return ResponseEntity.ok(requests);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/patients/{patientId}/history")
    public ResponseEntity<?> getPatientCareHistory(@AuthenticationPrincipal UserPrincipal principal,
                                                   @PathVariable String patientId) {
        try {
            List<Map<String, Object>> history = nurseService.getPatientCareHistory(principal.getId(), patientId);
            return ResponseEntity.ok(history);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/requests/{requestId}/respond")
    public ResponseEntity<?> respondToRequest(@AuthenticationPrincipal UserPrincipal principal,
                                              @PathVariable String requestId,
                                              @RequestBody Map<String, String> payload) {
        try {
            String action = payload.get("action");
            String reason = payload.get("reason");
            if (action == null || (!action.equals("Accept") && !action.equals("Reject") && !action.equals("AcceptHandover"))) {
                throw new RuntimeException("คำสั่งไม่ถูกต้อง (ต้องเป็น Accept, Reject หรือ AcceptHandover)");
            }
            nurseService.respondToRequest(principal.getId(), requestId, action, reason);
            Map<String, String> response = new HashMap<>();
            response.put("message", action.equals("Accept") ? "รับงานแล้ว" : "ปฏิเสธคำขอสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/requests/{requestId}/record")
    public ResponseEntity<?> recordCareVisit(@AuthenticationPrincipal UserPrincipal principal,
                                             @PathVariable String requestId,
                                             @Valid @RequestBody CareRecordDto request) {
        try {
            nurseService.recordCareVisit(principal.getId(), requestId, request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "บันทึกการให้บริการสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping({"/fee-requests", "/withdraw-requests"})
    public ResponseEntity<?> requestFee(@AuthenticationPrincipal UserPrincipal principal,
                                        @Valid @RequestBody WithdrawRequestDto request) {
        try {
            nurseService.requestFee(principal.getId(), request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "ส่งคำขอเบิกเงินสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
