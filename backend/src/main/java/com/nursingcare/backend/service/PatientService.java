package com.nursingcare.backend.service;
import com.nursingcare.backend.dto.request.PatientRequestDto;
import java.util.List;
import java.util.Map;
public interface PatientService {
    Map<String, Object> addPatient(String userId, PatientRequestDto request);
    List<Map<String, Object>> listPatients(String userId);
    Map<String, Object> getPatient(String userId, String patientId);
    void editPatient(String userId, String patientId, PatientRequestDto request);
    void updatePatientStatus(String userId, String patientId, String status);
    void deletePatient(String userId, String patientId);
}