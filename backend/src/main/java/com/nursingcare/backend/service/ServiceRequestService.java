package com.nursingcare.backend.service;
import com.nursingcare.backend.dto.request.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;
public interface ServiceRequestService {
    Map<String, Object> listServiceTypes();
    Map<String, Object> requestService(String userId, ServiceRequestCreateDto request);
    List<Map<String, Object>> listMyServiceRequests(String userId);
    Map<String, Object> getServiceDetail(String userId, String requestId);
    Map<String, Object> payForService(String userId, String requestId, MultipartFile slipFile);
    Map<String, Object> getReceipt(String userId, String requestId);
    void cancelServiceRequest(String userId, String requestId);
}