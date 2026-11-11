package com.nursingcare.backend.controller;

import com.nursingcare.backend.dto.request.ServiceRequestCreateDto;
import com.nursingcare.backend.security.UserPrincipal;
import com.nursingcare.backend.service.ServiceRequestService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/service-requests")
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    public ServiceRequestController(ServiceRequestService serviceRequestService) {
        this.serviceRequestService = serviceRequestService;
    }

    @GetMapping("/types")
    public ResponseEntity<?> listServiceTypes() {
        try {
            Map<String, Object> types = serviceRequestService.listServiceTypes();
            return ResponseEntity.ok(types);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping
    public ResponseEntity<?> requestService(@AuthenticationPrincipal UserPrincipal principal,
                                            @Valid @RequestBody ServiceRequestCreateDto request) {
        try {
            Map<String, Object> response = serviceRequestService.requestService(principal.getId(), request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping
    public ResponseEntity<?> listMyServiceRequests(@AuthenticationPrincipal UserPrincipal principal) {
        try {
            List<Map<String, Object>> requests = serviceRequestService.listMyServiceRequests(principal.getId());
            return ResponseEntity.ok(requests);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<?> getServiceDetail(@AuthenticationPrincipal UserPrincipal principal,
                                              @PathVariable String requestId) {
        try {
            Map<String, Object> detail = serviceRequestService.getServiceDetail(principal.getId(), requestId);
            return ResponseEntity.ok(detail);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping(value = "/{requestId}/pay", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> payForService(@AuthenticationPrincipal UserPrincipal principal,
                                           @PathVariable String requestId,
                                           @RequestParam("slip") MultipartFile slipFile) {
        try {
            Map<String, Object> response = serviceRequestService.payForService(principal.getId(), requestId, slipFile);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage() != null ? e.getMessage() : "การชำระเงินล้มเหลว");
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/{requestId}/receipt")
    public ResponseEntity<?> getReceipt(@AuthenticationPrincipal UserPrincipal principal,
                                        @PathVariable String requestId) {
        try {
            Map<String, Object> receipt = serviceRequestService.getReceipt(principal.getId(), requestId);
            return ResponseEntity.ok(receipt);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/{requestId}/cancel")
    public ResponseEntity<?> cancelServiceRequest(@AuthenticationPrincipal UserPrincipal principal,
                                                  @PathVariable String requestId) {
        try {
            serviceRequestService.cancelServiceRequest(principal.getId(), requestId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "ยกเลิกคำขอรับบริการสำเร็จ");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
