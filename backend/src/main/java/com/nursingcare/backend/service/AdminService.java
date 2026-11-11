package com.nursingcare.backend.service;
import java.util.List;
import java.util.Map;
public interface AdminService {
    List<Map<String, Object>> listPendingNurses();
    void verifyNurseLicense(String id, String decision);
    List<Map<String, Object>> searchNurseAccounts(String query);
    void suspendNurseAccount(String id, String status);
    List<Map<String, Object>> listAllServiceHistory();
    List<Map<String, Object>> getSettlementReport();
    void payFeeRequest(String id);
    void payFeeRequest(String id, String adminUserId);
}