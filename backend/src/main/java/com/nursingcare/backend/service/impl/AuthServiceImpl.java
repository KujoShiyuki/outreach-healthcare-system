package com.nursingcare.backend.service.impl;
import com.nursingcare.backend.dto.request.*;
import com.nursingcare.backend.entity.Member;
import com.nursingcare.backend.entity.Nurse;
import com.nursingcare.backend.entity.User;
import com.nursingcare.backend.repository.MemberRepository;
import com.nursingcare.backend.repository.NurseRepository;
import com.nursingcare.backend.repository.UserRepository;
import com.nursingcare.backend.security.JwtProvider;
import com.nursingcare.backend.service.AuthService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
@Service
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final NurseRepository nurseRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    public AuthServiceImpl(UserRepository userRepository, MemberRepository memberRepository, NurseRepository nurseRepository, PasswordEncoder passwordEncoder, JwtProvider jwtProvider) {
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.nurseRepository = nurseRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
    }
    @Override
    public Map<String, Object> login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow(() -> new RuntimeException("อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
        if ("Suspended".equalsIgnoreCase(user.getStatus())) throw new RuntimeException("บัญชีนี้ถูกระงับการใช้งาน");
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) throw new RuntimeException("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        String token = jwtProvider.generateToken(user.getId(), user.getRole());
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId()); userData.put("email", user.getEmail()); userData.put("role", user.getRole());
        Map<String, Object> response = new HashMap<>();
        response.put("token", token); response.put("user", userData);
        return response;
    }
    @Override
    @Transactional
    public Map<String, Object> registerMember(RegisterMemberRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) throw new RuntimeException("อีเมลนี้ถูกใช้งานแล้ว");
        if (request.getBirth_date() != null) {
            int age = java.time.Period.between(request.getBirth_date(), java.time.LocalDate.now()).getYears();
            if (age < 18) {
                throw new RuntimeException("ผู้สมัครใช้งานต้องมีอายุไม่ต่ำกว่า 18 ปีบริบูรณ์");
            }
        }
        User user = new User();
        user.setId(UUID.randomUUID().toString()); user.setEmail(request.getEmail()); user.setPassword(passwordEncoder.encode(request.getPassword())); user.setRole("patient");
        user.setFullname(request.getFirst_name()); user.setSurname(request.getLast_name()); user.setPhoneNumber(request.getPhone());
        user = userRepository.save(user);
        Member member = new Member();
        member.setId(UUID.randomUUID().toString()); member.setUser(user);
        member.setBirthDate(request.getBirth_date()); member.setPhoneNumber(request.getPhone()); member.setAddress(request.getAddress());
        member.setProvince(request.getProvince()); member.setDistrict(request.getDistrict());
        member.setLatitude(request.getLatitude()); member.setLongitude(request.getLongitude());
        memberRepository.save(member);
        String token = jwtProvider.generateToken(user.getId(), user.getRole());
        Map<String, Object> userData = new HashMap<>(); userData.put("id", user.getId()); userData.put("email", user.getEmail()); userData.put("role", user.getRole());
        Map<String, Object> response = new HashMap<>(); response.put("token", token); response.put("user", userData);
        return response;
    }
    @Override
    @Transactional
    public Map<String, Object> registerNurse(RegisterNurseRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) throw new RuntimeException("อีเมลนี้ถูกใช้งานแล้ว");
        User user = new User();
        user.setId(UUID.randomUUID().toString()); user.setEmail(request.getEmail()); user.setPassword(passwordEncoder.encode(request.getPassword())); user.setRole("nurse");
        user.setFullname(request.getFirst_name()); user.setSurname(request.getLast_name()); user.setPhoneNumber(request.getPhone());
        user = userRepository.save(user);
        Nurse nurse = new Nurse();
        nurse.setId(UUID.randomUUID().toString()); nurse.setUser(user);
        nurse.setProfessionalTier(request.getProfessional_tier());
        if (request.getBirth_date() != null) {
            int age = java.time.Period.between(request.getBirth_date(), java.time.LocalDate.now()).getYears();
            int minAge = "RN".equalsIgnoreCase(request.getProfessional_tier()) ? 20 : 18;
            if (age < minAge) {
                throw new RuntimeException("อายุของผู้สมัครต้องไม่ต่ำกว่า " + minAge + " ปี สำหรับระดับ " + request.getProfessional_tier());
            }
            nurse.setBirthDate(request.getBirth_date());
        }
        nurse.setNationalId(request.getNational_id()); nurse.setLicenseNumber(request.getLicense_no()); nurse.setBankAccountNumber(request.getBank_account_no()); nurse.setBankName(request.getBank_name());
        nurse.setServiceArea(request.getService_area()); nurse.setSpecialty(request.getSpecialties()); nurse.setPhoneNumber(request.getPhone());
        nurse.setLicenseFileUrl(request.getLicense_file_url());
        nurse.setIdentityDocumentUrl(request.getIdentity_document_url());
        nurse.setCriminalRecordUrl(request.getCriminal_record_url());
        nurse.setMedicalCertificateUrl(request.getMedical_certificate_url());
        if (request.getLicense_issue_date() != null) {
            nurse.setLicenseIssueDate(request.getLicense_issue_date());
        }
        if (request.getLicense_expire_date() != null) {
            nurse.setLicenseExpireDate(request.getLicense_expire_date());
        }
        nurse.setLatitude(request.getLatitude());
        nurse.setLongitude(request.getLongitude());
        nurse.setServiceRadiusKm(request.getService_radius_km() != null ? request.getService_radius_km() : 10.0);
        nurse.setRetired(request.getIs_retired() != null ? request.getIs_retired() : false);
        if (request.getAvailability_type() != null) {
            try {
                nurse.setAvailabilityType(com.nursingcare.backend.enums.AvailabilityType.valueOf(request.getAvailability_type()));
            } catch (Exception e) {
                nurse.setAvailabilityType(com.nursingcare.backend.enums.AvailabilityType.FIXED_TIME);
            }
        } else {
            nurse.setAvailabilityType(com.nursingcare.backend.enums.AvailabilityType.FIXED_TIME);
        }
        String defaultSchedule = Boolean.TRUE.equals(nurse.getRetired())
                ? "{\"shifts\":[\"morning_8h\",\"afternoon_8h\",\"day_12h\",\"night_12h\"],\"days\":[\"จันทร์\",\"อังคาร\",\"พุธ\",\"พฤหัสบดี\",\"ศุกร์\",\"เสาร์\",\"อาทิตย์\"],\"nurse_work_type\":\"FREELANCE\",\"hospital_code_schedule\":{}}"
                : "{\"shifts\":[\"morning_8h\",\"afternoon_8h\"],\"days\":[\"จันทร์\",\"อังคาร\",\"พุธ\",\"พฤหัสบดี\",\"ศุกร์\",\"เสาร์\",\"อาทิตย์\"],\"trade_note\":\"\",\"nurse_work_type\":\"HOSPITAL_STAFF\",\"hospital_code_schedule\":{}}";
        nurse.setShiftSchedule(defaultSchedule);
        nurseRepository.save(nurse);
        String token = jwtProvider.generateToken(user.getId(), user.getRole());
        Map<String, Object> userData = new HashMap<>(); userData.put("id", user.getId()); userData.put("email", user.getEmail()); userData.put("role", user.getRole());
        Map<String, Object> response = new HashMap<>(); response.put("token", token); response.put("user", userData); response.put("note", "รอตรวจสอบใบอนุญาต");
        return response;
    }
    @Override
    public Map<String, Object> getMemberProfile(String userId) {
        Member member = memberRepository.findByUser_Id(userId).orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลสมาชิก"));
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", member.getId()); profile.put("user_id", member.getUser().getId()); profile.put("first_name", member.getFullname());
        profile.put("last_name", member.getSurname()); profile.put("birth_date", member.getBirthDate()); profile.put("phone", member.getPhoneNumber());
        profile.put("address", member.getAddress()); profile.put("province", member.getProvince()); profile.put("district", member.getDistrict());
        profile.put("latitude", member.getLatitude()); profile.put("longitude", member.getLongitude());
        profile.put("email", member.getUser().getEmail());
        return profile;
    }
    @Override
    @Transactional
    public void updateMemberProfile(String userId, Map<String, Object> updates) {
        Member member = memberRepository.findByUser_Id(userId).orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลสมาชิก"));
        boolean userUpdated = false;
        if (updates.containsKey("first_name")) {
            member.setFullname((String) updates.get("first_name"));
            userUpdated = true;
        }
        if (updates.containsKey("last_name")) {
            member.setSurname((String) updates.get("last_name"));
            userUpdated = true;
        }
        if (updates.containsKey("phone")) {
            member.setPhoneNumber((String) updates.get("phone"));
            if (member.getUser() != null) {
                member.getUser().setPhoneNumber((String) updates.get("phone"));
                userUpdated = true;
            }
        }
        if (userUpdated && member.getUser() != null) {
            userRepository.save(member.getUser());
        }
        if (updates.containsKey("address")) member.setAddress((String) updates.get("address"));
        if (updates.containsKey("province")) member.setProvince((String) updates.get("province"));
        if (updates.containsKey("district")) member.setDistrict((String) updates.get("district"));
        if (updates.containsKey("latitude") && updates.get("latitude") != null) {
            member.setLatitude(Double.valueOf(updates.get("latitude").toString()));
        }
        if (updates.containsKey("longitude") && updates.get("longitude") != null) {
            member.setLongitude(Double.valueOf(updates.get("longitude").toString()));
        }
        memberRepository.save(member);
    }
    @Override
    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("ไม่พบบัญชีผู้ใช้"));
        if (!passwordEncoder.matches(request.getOld_password(), user.getPassword())) throw new RuntimeException("รหัสผ่านเดิมไม่ถูกต้อง");
        user.setPassword(passwordEncoder.encode(request.getNew_password()));
        userRepository.save(user);
    }
}