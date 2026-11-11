package com.nursingcare.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "patients")
public class Patient {

    @Id
    @Column(name = "patient_id", length = 36)
    private String id;

    @ManyToOne
    @JoinColumn(name = "member_id", referencedColumnName = "member_id", nullable = false)
    private Member member;

    @Column(length = 100, nullable = false)
    private String firstname;

    @Column(length = 100, nullable = false)
    private String lastname;

    @Column(length = 10)
    private String gender;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column
    private Integer age;

    @Column(length = 50)
    private String religion;

    @Column(name = "primary_language", length = 50)
    private String primaryLanguage;

    @Column(name = "relationship_to_member", length = 50)
    private String relationshipToMember;

    @Column(name = "emergency_contact_name", length = 100)
    private String emergencyContactName;

    @Column(name = "emergency_phone", length = 20)
    private String emergencyPhone;

    @Column(name = "emergency_relationship", length = 50)
    private String emergencyRelationship;

    @Column(name = "status", length = 20)
    private String status = "ACTIVE"; // ACTIVE, INACTIVE

    public Patient() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return id; }
    public void setPatientId(String patientId) { this.id = patientId; }

    public Member getMember() { return member; }
    public void setMember(Member member) { this.member = member; }

    public String getFirstname() { return firstname; }
    public void setFirstname(String firstname) { this.firstname = firstname; }

    public String getLastname() { return lastname; }
    public void setLastname(String lastname) { this.lastname = lastname; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getReligion() { return religion; }
    public void setReligion(String religion) { this.religion = religion; }

    public String getPrimaryLanguage() { return primaryLanguage; }
    public void setPrimaryLanguage(String primaryLanguage) { this.primaryLanguage = primaryLanguage; }

    public String getRelationshipToMember() { return relationshipToMember; }
    public void setRelationshipToMember(String relationshipToMember) { this.relationshipToMember = relationshipToMember; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyPhone() { return emergencyPhone; }
    public void setEmergencyPhone(String emergencyPhone) { this.emergencyPhone = emergencyPhone; }

    public String getEmergencyRelationship() { return emergencyRelationship; }
    public void setEmergencyRelationship(String emergencyRelationship) { this.emergencyRelationship = emergencyRelationship; }

    public String getStatus() { return status != null ? status : "ACTIVE"; }
    public void setStatus(String status) { this.status = status; }

    // UML Method
    public void updatePatientInfo(String firstname, String lastname, String gender, Integer age,
                                  String emergencyContactName, String emergencyPhone, String emergencyRelationship) {
        if (firstname != null) this.firstname = firstname;
        if (lastname != null) this.lastname = lastname;
        if (gender != null) this.gender = gender;
        if (age != null) this.age = age;
        if (emergencyContactName != null) this.emergencyContactName = emergencyContactName;
        if (emergencyPhone != null) this.emergencyPhone = emergencyPhone;
        if (emergencyRelationship != null) this.emergencyRelationship = emergencyRelationship;
    }
}
