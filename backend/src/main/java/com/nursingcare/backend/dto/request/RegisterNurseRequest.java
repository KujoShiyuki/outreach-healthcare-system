package com.nursingcare.backend.dto.request;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;
public class RegisterNurseRequest {
    @NotBlank @Email private String email;
    @NotBlank @Pattern(regexp = "^(?=.*[A-Z])(?=.*\\d).{8,}$") private String password;
    @NotBlank private String first_name;
    @NotBlank private String last_name;
    @NotBlank private String professional_tier;
    private String license_no;
    private LocalDate birth_date;
    private String national_id;
    private String bank_account_no;
    private String bank_name;
    private String service_area;
    private String specialties;
    private String phone;
    private String license_file_url; // URL/Data URL รูปถ่ายใบประกอบวิชาชีพ
    private String identity_document_url; // URL/Data URL บัตรประชาชน
    private String criminal_record_url; // URL/Data URL หนังสือรับรองประวัติอาชญากรรม
    private String medical_certificate_url; // URL/Data URL ใบรับรองแพทย์
    private String availability_type; // รูปแบบเวลาการรับงานตอนสมัคร
    private LocalDate license_issue_date;
    private LocalDate license_expire_date;
    private Double latitude;
    private Double longitude;
    private Double service_radius_km;
    private Boolean is_retired;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getFirst_name() { return first_name; }
    public void setFirst_name(String first_name) { this.first_name = first_name; }
    public String getLast_name() { return last_name; }
    public void setLast_name(String last_name) { this.last_name = last_name; }
    public String getProfessional_tier() { return professional_tier; }
    public void setProfessional_tier(String professional_tier) { this.professional_tier = professional_tier; }
    public String getLicense_no() { return license_no; }
    public void setLicense_no(String license_no) { this.license_no = license_no; }
    public LocalDate getBirth_date() { return birth_date; }
    public void setBirth_date(LocalDate birth_date) { this.birth_date = birth_date; }
    public String getNational_id() { return national_id; }
    public void setNational_id(String national_id) { this.national_id = national_id; }
    public String getBank_account_no() { return bank_account_no; }
    public void setBank_account_no(String bank_account_no) { this.bank_account_no = bank_account_no; }
    public String getBank_name() { return bank_name; }
    public void setBank_name(String bank_name) { this.bank_name = bank_name; }
    public String getService_area() { return service_area; }
    public void setService_area(String service_area) { this.service_area = service_area; }
    public String getSpecialties() { return specialties; }
    public void setSpecialties(String specialties) { this.specialties = specialties; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getLicense_file_url() { return license_file_url; }
    public void setLicense_file_url(String license_file_url) { this.license_file_url = license_file_url; }
    public String getIdentity_document_url() { return identity_document_url; }
    public void setIdentity_document_url(String identity_document_url) { this.identity_document_url = identity_document_url; }
    public String getCriminal_record_url() { return criminal_record_url; }
    public void setCriminal_record_url(String criminal_record_url) { this.criminal_record_url = criminal_record_url; }
    public String getMedical_certificate_url() { return medical_certificate_url; }
    public void setMedical_certificate_url(String medical_certificate_url) { this.medical_certificate_url = medical_certificate_url; }
    public String getAvailability_type() { return availability_type; }
    public void setAvailability_type(String availability_type) { this.availability_type = availability_type; }
    public LocalDate getLicense_issue_date() { return license_issue_date; }
    public void setLicense_issue_date(LocalDate license_issue_date) { this.license_issue_date = license_issue_date; }
    public LocalDate getLicense_expire_date() { return license_expire_date; }
    public void setLicense_expire_date(LocalDate license_expire_date) { this.license_expire_date = license_expire_date; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public Double getService_radius_km() { return service_radius_km; }
    public void setService_radius_km(Double service_radius_km) { this.service_radius_km = service_radius_km; }
    public Boolean getIs_retired() { return is_retired; }
    public void setIs_retired(Boolean is_retired) { this.is_retired = is_retired; }
}