package com.nursingcare.backend.service;
import com.nursingcare.backend.dto.request.*;
import java.util.Map;
public interface AuthService {
    Map<String, Object> login(LoginRequest request);
    Map<String, Object> registerMember(RegisterMemberRequest request);
    Map<String, Object> registerNurse(RegisterNurseRequest request);
    Map<String, Object> getMemberProfile(String userId);
    void updateMemberProfile(String userId, Map<String, Object> updates);
    void changePassword(String userId, ChangePasswordRequest request);
}