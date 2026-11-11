package com.nursingcare.backend.controller;

import com.nursingcare.backend.dto.request.SuspendNurseRequest;
import com.nursingcare.backend.dto.request.VerifyNurseRequest;
import com.nursingcare.backend.security.UserPrincipal;
import com.nursingcare.backend.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    private void checkAdmin(UserPrincipal principal) {
        if (!"admin".equalsIgnoreCase(principal.getRole())) {
            throw new RuntimeException("Access Denied: Admins only.");
        }
    }

    @GetMapping("/nurses/pending")
    public ResponseEntity<?> listPendingNurses(@AuthenticationPrincipal UserPrincipal principal) {
        try {
            checkAdmin(principal);
            List<Map<String, Object>> nurses = adminService.listPendingNurses();
            return ResponseEntity.ok(nurses);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/nurses/{nurseId}/verify")
    public ResponseEntity<?> verifyNurseLicense(@AuthenticationPrincipal UserPrincipal principal,
                                                @PathVariable String nurseId,
                                                @Valid @RequestBody VerifyNurseRequest request) {
        try {
            checkAdmin(principal);
            adminService.verifyNurseLicense(nurseId, request.getDecision());
            Map<String, String> response = new HashMap<>();
            response.put("message", "ยืนยันใบอนุญาตเรียบร้อย");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/nurses/search")
    public ResponseEntity<?> searchNurseAccounts(@AuthenticationPrincipal UserPrincipal principal,
                                                 @RequestParam(defaultValue = "") String query) {
        try {
            checkAdmin(principal);
            List<Map<String, Object>> nurses = adminService.searchNurseAccounts(query);
            return ResponseEntity.ok(nurses);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/nurses/{nurseId}/status")
    public ResponseEntity<?> suspendNurseAccount(@AuthenticationPrincipal UserPrincipal principal,
                                                 @PathVariable String nurseId,
                                                 @RequestBody SuspendNurseRequest request) {
        try {
            checkAdmin(principal);
            String targetStatus = request.getStatus() != null ? request.getStatus() : "Suspended";
            adminService.suspendNurseAccount(nurseId, targetStatus);
            Map<String, String> response = new HashMap<>();
            response.put("message", "เปลี่ยนสถานะบัญชีเรียบร้อย");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/reports/settlement")
    public ResponseEntity<?> getSettlementReport(@AuthenticationPrincipal UserPrincipal principal) {
        try {
            checkAdmin(principal);
            List<Map<String, Object>> report = adminService.getSettlementReport();
            return ResponseEntity.ok(report);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping({"/fee-requests/{feeRequestId}/pay", "/withdraw-requests/{feeRequestId}/pay"})
    public ResponseEntity<?> payFeeRequest(@AuthenticationPrincipal UserPrincipal principal,
                                           @PathVariable String feeRequestId) {
        try {
            checkAdmin(principal);
            adminService.payFeeRequest(feeRequestId, principal != null ? principal.getId() : null);
            Map<String, String> response = new HashMap<>();
            response.put("message", "โอนเงินค่าบริการสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
