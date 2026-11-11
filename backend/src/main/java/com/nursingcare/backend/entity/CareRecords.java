package com.nursingcare.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "care_records")
public class CareRecords {

    @Id
    @Column(name = "log_id", length = 36)
    private String id;

    @ManyToOne
    @JoinColumn(name = "service_id", referencedColumnName = "request_id", nullable = false)
    private ServiceRequest serviceRequest;

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;

    @Column(length = 50)
    private String consciousness; // Alert, Drowsy, Confusion, Unconscious

    @Column(length = 50)
    private String excretion; // Normal, Abnormal, Constipation/Diarrhea

    @Column(name = "patient_condition", columnDefinition = "TEXT")
    private String patientCondition;

    @Column(name = "care_given", columnDefinition = "TEXT")
    private String careGiven;

    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;

    @Column(name = "medication_record", columnDefinition = "TEXT")
    private String medicationRecord;

    @Column(name = "care_image_url", columnDefinition = "LONGTEXT")
    private String careImageUrl;

    @Column(name = "nurse_notes", columnDefinition = "TEXT")
    private String nurseNotes;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @OneToOne(mappedBy = "careRecord", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private vital_sign_records vitalSignRecord;

    public CareRecords() {}

    // --- Core Getters & Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public ServiceRequest getServiceRequest() { return serviceRequest; }
    public void setServiceRequest(ServiceRequest serviceRequest) { this.serviceRequest = serviceRequest; }

    public LocalDate getVisitDate() { return visitDate; }
    public void setVisitDate(LocalDate visitDate) { this.visitDate = visitDate; }

    public String getConsciousness() { return consciousness; }
    public void setConsciousness(String consciousness) { this.consciousness = consciousness; }

    public String getExcretion() { return excretion; }
    public void setExcretion(String excretion) { this.excretion = excretion; }

    public String getPatientCondition() { return patientCondition; }
    public void setPatientCondition(String patientCondition) { this.patientCondition = patientCondition; }

    public String getCareGiven() { return careGiven; }
    public void setCareGiven(String careGiven) { this.careGiven = careGiven; }

    public LocalDateTime getCheckInTime() { return checkInTime; }
    public void setCheckInTime(LocalDateTime checkInTime) { this.checkInTime = checkInTime; }

    public LocalDateTime getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(LocalDateTime checkOutTime) { this.checkOutTime = checkOutTime; }

    public String getMedicationRecord() { return medicationRecord; }
    public void setMedicationRecord(String medicationRecord) { this.medicationRecord = medicationRecord; }

    public String getSymptomSummary() { return nurseNotes; }
    public void setSymptomSummary(String symptomSummary) { this.nurseNotes = symptomSummary; }

    public String getCareImageUrl() { return careImageUrl; }
    public void setCareImageUrl(String careImageUrl) { this.careImageUrl = careImageUrl; }

    public String getNurseNotes() { return nurseNotes; }
    public void setNurseNotes(String nurseNotes) { this.nurseNotes = nurseNotes; }

    public String getNurseNote() { return nurseNotes; }
    public void setNurseNote(String nurseNote) { this.nurseNotes = nurseNote; }

    public LocalDate getFollowUpDate() { return followUpDate; }
    public void setFollowUpDate(LocalDate followUpDate) { this.followUpDate = followUpDate; }

    public vital_sign_records getVitalSignRecord() { return vitalSignRecord; }
    public void setVitalSignRecord(vital_sign_records vitalSignRecord) { this.vitalSignRecord = vitalSignRecord; }

    // --- VitalSignRecord Delegation Methods ---

    private vital_sign_records ensureVitalSignRecord() {
        if (this.vitalSignRecord == null) {
            this.vitalSignRecord = new vital_sign_records();
            this.vitalSignRecord.setId(UUID.randomUUID().toString());
            this.vitalSignRecord.setCareRecord(this);
        }
        return this.vitalSignRecord;
    }

    public String getBloodPressure() {
        return vitalSignRecord != null ? vitalSignRecord.getBloodPressure() : null;
    }
    public void setBloodPressure(String bloodPressure) {
        ensureVitalSignRecord().setBloodPressure(bloodPressure);
    }

    public Integer getHeartRate() {
        return vitalSignRecord != null ? vitalSignRecord.getHeartRate() : null;
    }
    public void setHeartRate(Integer heartRate) {
        ensureVitalSignRecord().setHeartRate(heartRate);
    }

    public Double getBodyTemperature() {
        return vitalSignRecord != null ? vitalSignRecord.getBodyTemperature() : null;
    }
    public void setBodyTemperature(Double bodyTemperature) {
        ensureVitalSignRecord().setBodyTemperature(bodyTemperature);
    }

    public Integer getOxygenSaturation() {
        return vitalSignRecord != null ? vitalSignRecord.getOxygenSaturation() : null;
    }
    public void setOxygenSaturation(Integer oxygenSaturation) {
        ensureVitalSignRecord().setOxygenSaturation(oxygenSaturation);
    }

    public Integer getRespiratoryRate() {
        return vitalSignRecord != null ? vitalSignRecord.getRespiratoryRate() : null;
    }
    public void setRespiratoryRate(Integer respiratoryRate) {
        ensureVitalSignRecord().setRespiratoryRate(respiratoryRate);
    }

    public Double getWeight() {
        return vitalSignRecord != null ? vitalSignRecord.getWeight() : null;
    }
    public void setWeight(Double weight) {
        ensureVitalSignRecord().setWeight(weight);
    }

    public Integer getPainScore() {
        return vitalSignRecord != null ? vitalSignRecord.getPainScore() : null;
    }
    public void setPainScore(Integer painScore) {
        ensureVitalSignRecord().setPainScore(painScore);
    }

    public String getPainLocation() {
        return vitalSignRecord != null ? vitalSignRecord.getPainLocation() : null;
    }
    public void setPainLocation(String painLocation) {
        ensureVitalSignRecord().setPainLocation(painLocation);
    }

    // --- UML Aliases (Class Diagram: CareRecords) ---

    public String getLogId() { return id; }
    public void setLogId(String logId) { this.id = logId; }

    public String getConsciousnessStatus() { return consciousness; }
    public void setConsciousnessStatus(String consciousnessStatus) { this.consciousness = consciousnessStatus; }

    public String getExcretionStatus() { return excretion; }
    public void setExcretionStatus(String excretionStatus) { this.excretion = excretionStatus; }

    public String getPatientStatusSummary() { return patientCondition; }
    public void setPatientStatusSummary(String patientStatusSummary) { this.patientCondition = patientStatusSummary; }

    public String getTreatmentDetail() { return careGiven; }
    public void setTreatmentDetail(String treatmentDetail) { this.careGiven = treatmentDetail; }

    public LocalDate getNextAppointment() { return followUpDate; }
    public void setNextAppointment(LocalDate nextAppointment) { this.followUpDate = nextAppointment; }

    public void recordTreatment() {}
}
