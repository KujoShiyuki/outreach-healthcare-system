package com.nursingcare.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "nurses")
public class Nurse {

    @Id
    @Column(name = "nurse_id", length = 36)
    private String id;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private User user;

    @Column(name = "national_id", length = 13, nullable = false)
    private String nationalId;

    @Column(name = "professional_tier", length = 50)
    private String professionalTier; // RN, PN, CG

    @Column(name = "bank_account_number", length = 20)
    private String bankAccountNumber;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "service_area", length = 100)
    private String serviceArea;

    @Column(length = 100)
    private String specialty;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability_type", length = 20)
    private com.nursingcare.backend.enums.AvailabilityType availabilityType;

    @Column(name = "shift_schedule", length = 2000)
    private String shiftSchedule;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "service_radius_km")
    private Double serviceRadiusKm = 10.0;

    @Column(name = "is_retired")
    private Boolean retired = false;

    @OneToOne(mappedBy = "nurse", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private NurseLicense credential;

    public Nurse() {}

    // --- Core Getters & Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getFullname() {
        return user != null ? user.getFullname() : null;
    }
    public void setFullname(String fullname) {
        if (this.user != null) {
            this.user.setFullname(fullname);
        }
    }

    public String getSurname() {
        return user != null ? user.getSurname() : null;
    }
    public void setSurname(String surname) {
        if (this.user != null) {
            this.user.setSurname(surname);
        }
    }

    public String getNationalId() { return nationalId; }
    public void setNationalId(String nationalId) { this.nationalId = nationalId; }

    public String getNationalID() { return nationalId; }
    public void setNationalID(String nationalID) { this.nationalId = nationalID; }

    public String getProfessionalTier() { return professionalTier; }
    public void setProfessionalTier(String professionalTier) { this.professionalTier = professionalTier; }

    public String getPhoneNumber() {
        return user != null ? user.getPhoneNumber() : null;
    }
    public void setPhoneNumber(String phoneNumber) {
        if (this.user != null) {
            this.user.setPhoneNumber(phoneNumber);
        }
    }

    public String getBankAccountNumber() { return bankAccountNumber; }
    public void setBankAccountNumber(String bankAccountNumber) { this.bankAccountNumber = bankAccountNumber; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getServiceArea() { return serviceArea; }
    public void setServiceArea(String serviceArea) { this.serviceArea = serviceArea; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

    public com.nursingcare.backend.enums.AvailabilityType getAvailabilityType() { return availabilityType; }
    public void setAvailabilityType(com.nursingcare.backend.enums.AvailabilityType availabilityType) { this.availabilityType = availabilityType; }

    public String getShiftSchedule() { return shiftSchedule; }
    public void setShiftSchedule(String shiftSchedule) { this.shiftSchedule = shiftSchedule; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getServiceRadiusKm() { return serviceRadiusKm; }
    public void setServiceRadiusKm(Double serviceRadiusKm) { this.serviceRadiusKm = serviceRadiusKm; }

    public Boolean getRetired() { return retired != null ? retired : false; }
    public void setRetired(Boolean retired) { this.retired = retired; }

    public NurseLicense getCredential() { return credential; }
    public void setCredential(NurseLicense credential) { this.credential = credential; }

    public NurseLicense getLicense() { return credential; }
    public void setLicense(NurseLicense license) { this.credential = license; }

    // --- Credential Delegation Methods (Fields moved to NurseLicense as per Class Diagram) ---

    private NurseLicense ensureCredential() {
        if (this.credential == null) {
            this.credential = new NurseLicense();
            this.credential.setId(UUID.randomUUID().toString());
            this.credential.setNurse(this);
        }
        return this.credential;
    }

    public String getLicenseNumber() {
        return credential != null ? credential.getLicenseNumber() : null;
    }
    public void setLicenseNumber(String licenseNumber) {
        ensureCredential().setLicenseNumber(licenseNumber);
    }

    public String getApprovalStatus() {
        return credential != null ? credential.getApprovalStatus() : "Pending";
    }
    public void setApprovalStatus(String approvalStatus) {
        ensureCredential().setApprovalStatus(approvalStatus);
    }

    public LocalDate getLicenseIssueDate() {
        return credential != null ? credential.getLicenseIssueDate() : null;
    }
    public void setLicenseIssueDate(LocalDate licenseIssueDate) {
        ensureCredential().setLicenseIssueDate(licenseIssueDate);
    }

    public LocalDate getLicenseExpireDate() {
        return credential != null ? credential.getLicenseExpireDate() : null;
    }
    public void setLicenseExpireDate(LocalDate licenseExpireDate) {
        ensureCredential().setLicenseExpireDate(licenseExpireDate);
    }

    public String getLicenseFileUrl() {
        return credential != null ? credential.getLicenseFileUrl() : null;
    }
    public void setLicenseFileUrl(String licenseFileUrl) {
        ensureCredential().setLicenseFileUrl(licenseFileUrl);
    }

    public String getIdentityDocumentUrl() {
        return credential != null ? credential.getIdentityDocumentUrl() : null;
    }
    public void setIdentityDocumentUrl(String identityDocumentUrl) {
        ensureCredential().setIdentityDocumentUrl(identityDocumentUrl);
    }

    public String getCriminalRecordUrl() {
        return credential != null ? credential.getCriminalRecordUrl() : null;
    }
    public void setCriminalRecordUrl(String criminalRecordUrl) {
        ensureCredential().setCriminalRecordUrl(criminalRecordUrl);
    }

    public String getMedicalCertificateUrl() {
        return credential != null ? credential.getMedicalCertificateUrl() : null;
    }
    public void setMedicalCertificateUrl(String medicalCertificateUrl) {
        ensureCredential().setMedicalCertificateUrl(medicalCertificateUrl);
    }

    // --- UML Aliases & Methods (Class Diagram) ---

    public Boolean getIsRetired() { return getRetired(); }
    public void setIsRetired(Boolean isRetired) { setRetired(isRetired); }

    public void registerForNurse() {}
    public void updateServiceArea(String serviceArea, Double serviceRadiusKm) {
        this.serviceArea = serviceArea;
        this.serviceRadiusKm = serviceRadiusKm;
    }
    public void acceptRejectRequest() {}
    public void viewAssignedRequests() {}
}
