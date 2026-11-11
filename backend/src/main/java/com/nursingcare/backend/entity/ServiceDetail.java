package com.nursingcare.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "service_details")
public class ServiceDetail {

    @Id
    @Column(name = "service_detail_id", length = 36)
    private String id;

    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "service_id", referencedColumnName = "request_id", nullable = false)
    private ServiceRequest serviceRequest;

    @Column(name = "special_precautions", columnDefinition = "TEXT")
    private String specialPrecautions;

    @Column(name = "additional_note", columnDefinition = "TEXT")
    private String additionalNote;

    @Column(name = "is_complex_wound")
    private Boolean isComplexWound = false;

    @Column(name = "wound_photo_url", columnDefinition = "LONGTEXT")
    private String woundPhotoUrl;

    public ServiceDetail() {}

    public ServiceDetail(String id, ServiceRequest serviceRequest, String specialPrecautions, String additionalNote) {
        this.id = id;
        this.serviceRequest = serviceRequest;
        this.specialPrecautions = specialPrecautions;
        this.additionalNote = additionalNote;
    }

    // --- Getters & Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getServiceDetailId() { return id; }
    public void setServiceDetailId(String serviceDetailId) { this.id = serviceDetailId; }

    public ServiceRequest getServiceRequest() { return serviceRequest; }
    public void setServiceRequest(ServiceRequest serviceRequest) { this.serviceRequest = serviceRequest; }

    public String getSpecialPrecautions() { return specialPrecautions; }
    public void setSpecialPrecautions(String specialPrecautions) { this.specialPrecautions = specialPrecautions; }

    public String getAdditionalNote() { return additionalNote; }
    public void setAdditionalNote(String additionalNote) { this.additionalNote = additionalNote; }

    public Boolean getIsComplexWound() { return isComplexWound != null ? isComplexWound : false; }
    public void setIsComplexWound(Boolean isComplexWound) { this.isComplexWound = isComplexWound; }

    public String getWoundPhotoUrl() { return woundPhotoUrl; }
    public void setWoundPhotoUrl(String woundPhotoUrl) { this.woundPhotoUrl = woundPhotoUrl; }

    // --- UML Method ---

    public String getDetailSummary() {
        StringBuilder sb = new StringBuilder();
        if (specialPrecautions != null && !specialPrecautions.isBlank()) {
            sb.append("ข้อควรระวัง: ").append(specialPrecautions).append("; ");
        }
        if (additionalNote != null && !additionalNote.isBlank()) {
            sb.append("หมายเหตุ: ").append(additionalNote);
        }
        return sb.toString();
    }
}
