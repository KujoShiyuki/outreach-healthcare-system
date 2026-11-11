package com.nursingcare.backend.controller;

import com.nursingcare.backend.dto.request.ChangePasswordRequest;
import com.nursingcare.backend.security.UserPrincipal;
import com.nursingcare.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/member")
public class MemberController {

    private final AuthService authService;

    public MemberController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal UserPrincipal principal) {
        try {
            Map<String, Object> profile = authService.getMemberProfile(principal.getId());
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
            authService.updateMemberProfile(principal.getId(), updates);
            Map<String, String> response = new HashMap<>();
            response.put("message", "แก้ไขข้อมูลส่วนตัวสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                            @Valid @RequestBody ChangePasswordRequest request) {
        try {
            authService.changePassword(principal.getId(), request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "เปลี่ยนรหัสผ่านสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
