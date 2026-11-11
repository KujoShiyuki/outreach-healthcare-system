package com.nursingcare.backend.service;
import com.nursingcare.backend.dto.request.*;
import java.util.List;
import java.util.Map;
public interface NurseService {
    List<Map<String, Object>> publicSearchNurses(String area, String specialty, Boolean isSpecialist, String tier, Boolean isRetired);
    List<Map<String, Object>> publicSearchNurses(String area, String specialty, Boolean isSpecialist, String tier);
    List<Map<String, Object>> publicSearchNurses(String area, String specialty, Boolean isSpecialist);
    Map<String, Object> getNurseProfile(String userId);
    void updateNurseProfile(String userId, Map<String, Object> updates);
    Map<String, List<Map<String, Object>>> getNurseRequests(String userId);
    void respondToRequest(String userId, String requestId, String action);
    void respondToRequest(String userId, String requestId, String action, String reason);
    void recordCareVisit(String userId, String requestId, CareRecordDto request);
    void requestFee(String userId, WithdrawRequestDto request);
    List<Map<String, Object>> getPatientCareHistory(String userId, String patientId);
}