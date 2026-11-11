package com.nursingcare.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "nurse_credentials")
public class NurseLicense {

    @Id
    @Column(name = "credential_id", length = 36)
    private String id;

    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "nurse_id", referencedColumnName = "nurse_id", nullable = false)
    private Nurse nurse;

    @Column(name = "license_number", length = 50)
    private String licenseNumber;

    @Column(name = "license_issue_date")
    private LocalDate licenseIssueDate;

    @Column(name = "license_expire_date")
    private LocalDate licenseExpireDate;

    @Column(name = "license_file_url", columnDefinition = "LONGTEXT")
    private String licenseFileUrl;

    @Column(name = "identity_document_url", columnDefinition = "LONGTEXT")
    private String identityDocumentUrl;

    @Column(name = "criminal_record_url", columnDefinition = "LONGTEXT")
    private String criminalRecordUrl;

    @Column(name = "medical_certificate_url", columnDefinition = "LONGTEXT")
    private String medicalCertificateUrl;

    @Column(name = "approval_status", length = 50)
    private String approvalStatus = "Pending"; // Pending, Verified, Rejected

    public NurseLicense() {}

    // --- Getters & Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Nurse getNurse() { return nurse; }
    public void setNurse(Nurse nurse) { this.nurse = nurse; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public LocalDate getLicenseIssueDate() { return licenseIssueDate; }
    public void setLicenseIssueDate(LocalDate licenseIssueDate) { this.licenseIssueDate = licenseIssueDate; }

    public LocalDate getLicenseExpireDate() { return licenseExpireDate; }
    public void setLicenseExpireDate(LocalDate licenseExpireDate) { this.licenseExpireDate = licenseExpireDate; }

    public String getLicenseFileUrl() { return licenseFileUrl; }
    public void setLicenseFileUrl(String licenseFileUrl) { this.licenseFileUrl = licenseFileUrl; }

    public String getIdentityDocumentUrl() { return identityDocumentUrl; }
    public void setIdentityDocumentUrl(String identityDocumentUrl) { this.identityDocumentUrl = identityDocumentUrl; }

    public String getCriminalRecordUrl() { return criminalRecordUrl; }
    public void setCriminalRecordUrl(String criminalRecordUrl) { this.criminalRecordUrl = criminalRecordUrl; }

    public String getMedicalCertificateUrl() { return medicalCertificateUrl; }
    public void setMedicalCertificateUrl(String medicalCertificateUrl) { this.medicalCertificateUrl = medicalCertificateUrl; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    // --- UML Aliases (Class Diagram: NurseLicense) ---

    public String getCredentialId() { return id; }
    public void setCredentialId(String credentialId) { this.id = credentialId; }

    public LocalDate getLicenseEcpireDate() { return licenseExpireDate; }
    public void setLicenseEcpireDate(LocalDate licenseEcpireDate) { this.licenseExpireDate = licenseEcpireDate; }

    public void uploadDocuments(String licenseFileUrl, String identityDocumentUrl,
                                String criminalRecordUrl, String medicalCertificateUrl) {
        this.licenseFileUrl = licenseFileUrl;
        this.identityDocumentUrl = identityDocumentUrl;
        this.criminalRecordUrl = criminalRecordUrl;
        this.medicalCertificateUrl = medicalCertificateUrl;
        this.approvalStatus = "Pending";
    }

    public void verifyLicense(String decision) {
        this.approvalStatus = decision;
    }

    public boolean isLicenseExpired() {
        if (licenseExpireDate == null) return false;
        return LocalDate.now().isAfter(licenseExpireDate);
    }
}
