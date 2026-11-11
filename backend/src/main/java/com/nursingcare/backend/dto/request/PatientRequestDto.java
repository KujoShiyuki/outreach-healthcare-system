package com.nursingcare.backend.dto.request;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.Map;
public class PatientRequestDto {
    @NotBlank private String first_name;
    @NotBlank private String last_name;
    private String gender;
    private LocalDate birth_date;
    private Integer age;
    private String religion;
    private String main_language;
    private String relationship_to_member;
    private String emergency_contact_name;
    private String emergency_contact_phone;
    private String emergency_contact_relationship;
    private String status;
    private Map<String, Object> health_profile;

    public String getFirst_name() { return first_name; }
    public void setFirst_name(String first_name) { this.first_name = first_name; }
    public String getLast_name() { return last_name; }
    public void setLast_name(String last_name) { this.last_name = last_name; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public LocalDate getBirth_date() { return birth_date; }
    public void setBirth_date(LocalDate birth_date) { this.birth_date = birth_date; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getReligion() { return religion; }
    public void setReligion(String religion) { this.religion = religion; }
    public String getMain_language() { return main_language; }
    public void setMain_language(String main_language) { this.main_language = main_language; }
    public String getRelationship_to_member() { return relationship_to_member; }
    public void setRelationship_to_member(String relationship_to_member) { this.relationship_to_member = relationship_to_member; }
    public String getEmergency_contact_name() { return emergency_contact_name; }
    public void setEmergency_contact_name(String emergency_contact_name) { this.emergency_contact_name = emergency_contact_name; }
    public String getEmergency_contact_phone() { return emergency_contact_phone; }
    public void setEmergency_contact_phone(String emergency_contact_phone) { this.emergency_contact_phone = emergency_contact_phone; }
    public String getEmergency_contact_relationship() { return emergency_contact_relationship; }
    public void setEmergency_contact_relationship(String emergency_contact_relationship) { this.emergency_contact_relationship = emergency_contact_relationship; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Map<String, Object> getHealth_profile() { return health_profile; }
    public void setHealth_profile(Map<String, Object> health_profile) { this.health_profile = health_profile; }
}