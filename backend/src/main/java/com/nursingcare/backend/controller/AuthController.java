package com.nursingcare.backend.controller;

import com.nursingcare.backend.dto.request.LoginRequest;
import com.nursingcare.backend.dto.request.RegisterMemberRequest;
import com.nursingcare.backend.dto.request.RegisterNurseRequest;
import com.nursingcare.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            Map<String, Object> response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/register/member")
    public ResponseEntity<?> registerMember(@Valid @RequestBody RegisterMemberRequest request) {
        try {
            Map<String, Object> response = authService.registerMember(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/register/nurse")
    public ResponseEntity<?> registerNurse(@Valid @RequestBody RegisterNurseRequest request) {
        try {
            Map<String, Object> response = authService.registerNurse(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
