package com.nursingcare.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vital_sign_records")
public class vital_sign_records {

    @Id
    @Column(name = "vital_id", length = 36)
    private String id;

    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "log_id", referencedColumnName = "log_id", nullable = false)
    private CareRecords careRecord;

    @Column(name = "blood_pressure", length = 20)
    private String bloodPressure;

    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "body_temperature")
    private Double bodyTemperature;

    @Column(name = "oxygen_saturation")
    private Integer oxygenSaturation;

    @Column(name = "respiratory_rate")
    private Integer respiratoryRate;

    @Column(name = "weight")
    private Double weight;

    @Column(name = "pain_score")
    private Integer painScore;

    @Column(name = "pain_location", length = 100)
    private String painLocation;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt = LocalDateTime.now();

    public vital_sign_records() {}

    // --- Getters & Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getVitalId() { return id; }
    public void setVitalId(String vitalId) { this.id = vitalId; }

    public CareRecords getCareRecord() { return careRecord; }
    public void setCareRecord(CareRecords careRecord) { this.careRecord = careRecord; }

    public String getBloodPressure() { return bloodPressure; }
    public void setBloodPressure(String bloodPressure) { this.bloodPressure = bloodPressure; }

    public Integer getHeartRate() { return heartRate; }
    public void setHeartRate(Integer heartRate) { this.heartRate = heartRate; }

    public Double getBodyTemperature() { return bodyTemperature; }
    public void setBodyTemperature(Double bodyTemperature) { this.bodyTemperature = bodyTemperature; }

    public Integer getOxygenSaturation() { return oxygenSaturation; }
    public void setOxygenSaturation(Integer oxygenSaturation) { this.oxygenSaturation = oxygenSaturation; }

    public Integer getRespiratoryRate() { return respiratoryRate; }
    public void setRespiratoryRate(Integer respiratoryRate) { this.respiratoryRate = respiratoryRate; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Integer getPainScore() { return painScore; }
    public void setPainScore(Integer painScore) { this.painScore = painScore; }

    public String getPainLocation() { return painLocation; }
    public void setPainLocation(String painLocation) { this.painLocation = painLocation; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }

    public LocalDateTime getRecordAt() { return recordedAt; }
    public void setRecordAt(LocalDateTime recordAt) { this.recordedAt = recordAt; }

    // --- UML Method ---

    public Boolean isVitalNormal() {
        boolean bpOk = true;
        if (bloodPressure != null && bloodPressure.contains("/")) {
            try {
                String[] parts = bloodPressure.split("/");
                int systolic = Integer.parseInt(parts[0].trim());
                int diastolic = Integer.parseInt(parts[1].trim());
                bpOk = systolic >= 90 && systolic <= 140 && diastolic >= 60 && diastolic <= 90;
            } catch (NumberFormatException e) {
                bpOk = true;
            }
        }
        boolean hrOk = heartRate == null || (heartRate >= 60 && heartRate <= 100);
        boolean tempOk = bodyTemperature == null || (bodyTemperature >= 36.0 && bodyTemperature <= 37.5);
        boolean o2Ok = oxygenSaturation == null || oxygenSaturation >= 95;
        boolean rrOk = respiratoryRate == null || (respiratoryRate >= 12 && respiratoryRate <= 20);

        return bpOk && hrOk && tempOk && o2Ok && rrOk;
    }
}
