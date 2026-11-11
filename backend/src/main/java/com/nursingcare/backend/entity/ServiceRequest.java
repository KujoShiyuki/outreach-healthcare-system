package com.nursingcare.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "service_requests")
public class ServiceRequest {

    // --- UML Attributes (Class Diagram) ---

    @Id
    @Column(name = "request_id", length = 36)
    private String id; // serviceId : String

    @Column(name = "service_status", length = 50, nullable = false)
    private String status = "Pending"; // serviceStatus : String

    @Column(name = "subscription_type", length = 50)
    private String subscriptionType; // subscriptionType : String

    @Column(name = "start_date")
    private String startDate; // startDate : Date (String in Java for multi-date/range support)

    @Column(name = "end_date")
    private LocalDate endDate; // endDate : Date

    @Column(name = "time_slot", length = 50, nullable = false)
    private String timeSlot; // timeSlot : String

    @Column(name = "total_amount")
    private Double totalPrice; // totalAmount : Double

    @Column(name = "service_address", columnDefinition = "TEXT", nullable = false)
    private String serviceAddress; // serviceAddress : String

    @Column(name = "is_prepaid")
    private Boolean isPrepaid = true; // isPrepaid : Boolean

    @Column(name = "total_session")
    private Integer serviceCount = 1; // totalSession : Integer

    @Column(name = "remain_session")
    private Integer remainingServiceCount = 1; // remainSession : Integer

    // --- UML Relationships ---

    @ManyToOne
    @JoinColumn(name = "patient_id", referencedColumnName = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "nurse_id", referencedColumnName = "nurse_id")
    private Nurse nurse;

    @ManyToOne
    @JoinColumn(name = "package_id", referencedColumnName = "package_id")
    private ServicePackage servicePackage;

    @OneToOne(mappedBy = "serviceRequest", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private ServiceDetail serviceDetail;

    @OneToOne(mappedBy = "serviceRequest", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private Payment payment;

    @Column(name = "service_dates", columnDefinition = "TEXT")
    private String serviceDates;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Transient
    private Double basePrice;

    public ServiceRequest() {}

    // --- Core UML Getters & Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getServiceId() { return id; }
    public void setServiceId(String serviceId) { this.id = serviceId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getServiceStatus() { return status; }
    public void setServiceStatus(String serviceStatus) { this.status = serviceStatus; }

    public String getSubscriptionType() {
        if (subscriptionType != null) return subscriptionType;
        return servicePackage != null ? servicePackage.getSubscriptionType() : "Per Cycle";
    }
    public void setSubscriptionType(String subscriptionType) { this.subscriptionType = subscriptionType; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getTimeSlot() { return timeSlot; }
    public void setTimeSlot(String timeSlot) { this.timeSlot = timeSlot; }

    public Double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(Double totalPrice) {
        this.totalPrice = totalPrice;
        if (this.payment != null) {
            this.payment.setTotalAmount(totalPrice);
        }
    }

    public Double getTotalAmount() { return totalPrice; }
    public void setTotalAmount(Double totalAmount) { setTotalPrice(totalAmount); }

    public String getServiceAddress() { return serviceAddress; }
    public void setServiceAddress(String serviceAddress) { this.serviceAddress = serviceAddress; }

    public Boolean getIsPrepaid() { return isPrepaid; }
    public void setIsPrepaid(Boolean isPrepaid) { this.isPrepaid = isPrepaid; }

    public Integer getServiceCount() { return serviceCount; }
    public void setServiceCount(Integer serviceCount) { this.serviceCount = serviceCount; }

    public Integer getTotalSession() { return serviceCount; }
    public void setTotalSession(Integer totalSession) { this.serviceCount = totalSession; }

    public Integer getRemainingServiceCount() { return remainingServiceCount; }
    public void setRemainingServiceCount(Integer remainingServiceCount) { this.remainingServiceCount = remainingServiceCount; }

    public Integer getRemainSession() { return remainingServiceCount; }
    public void setRemainSession(Integer remainSession) { this.remainingServiceCount = remainSession; }

    public Patient getPatient() { return patient; }
    public void setPatient(Patient patient) { this.patient = patient; }

    public Nurse getNurse() { return nurse; }
    public void setNurse(Nurse nurse) { this.nurse = nurse; }

    public ServicePackage getServicePackage() { return servicePackage; }
    public void setServicePackage(ServicePackage servicePackage) {
        this.servicePackage = servicePackage;
        if (servicePackage != null && this.subscriptionType == null) {
            this.subscriptionType = servicePackage.getSubscriptionType();
        }
    }

    public ServiceDetail getServiceDetail() { return serviceDetail; }
    public void setServiceDetail(ServiceDetail serviceDetail) { this.serviceDetail = serviceDetail; }

    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }

    public String getServiceTypeName() {
        if (servicePackage != null) {
            if (servicePackage.getServiceCategory() != null) {
                return servicePackage.getServiceCategory().getCategoryName();
            }
            return servicePackage.getPackageName();
        }
        return "บริการดูแลสุขภาพ";
    }

    public String getServiceDates() { return serviceDates; }
    public void setServiceDates(String serviceDates) { this.serviceDates = serviceDates; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getBasePrice() {
        if (basePrice != null) return basePrice;
        if (servicePackage != null && servicePackage.getPricePerCycle() != null) return servicePackage.getPricePerCycle();
        return totalPrice;
    }
    public void setBasePrice(Double basePrice) { this.basePrice = basePrice; }

    // --- ServiceDetail Delegation (Clinical fields cleanly decoupled to ServiceDetail) ---

    private ServiceDetail ensureServiceDetail() {
        if (this.serviceDetail == null) {
            this.serviceDetail = new ServiceDetail();
            this.serviceDetail.setId(UUID.randomUUID().toString());
            this.serviceDetail.setServiceRequest(this);
        }
        return this.serviceDetail;
    }

    public String getSpecialPrecautions() {
        return serviceDetail != null ? serviceDetail.getSpecialPrecautions() : null;
    }
    public void setSpecialPrecautions(String specialPrecautions) {
        ensureServiceDetail().setSpecialPrecautions(specialPrecautions);
    }

    public String getAdditionalNotes() {
        return serviceDetail != null ? serviceDetail.getAdditionalNote() : null;
    }
    public void setAdditionalNotes(String additionalNotes) {
        ensureServiceDetail().setAdditionalNote(additionalNotes);
    }

    public Boolean getIsComplexWound() {
        return serviceDetail != null ? serviceDetail.getIsComplexWound() : false;
    }
    public void setIsComplexWound(Boolean isComplexWound) {
        ensureServiceDetail().setIsComplexWound(isComplexWound);
    }

    public String getWoundPhotoUrl() {
        return serviceDetail != null ? serviceDetail.getWoundPhotoUrl() : null;
    }
    public void setWoundPhotoUrl(String woundPhotoUrl) {
        ensureServiceDetail().setWoundPhotoUrl(woundPhotoUrl);
    }

    // --- Payment Delegation (Financial fields cleanly decoupled to Payment) ---

    private Payment ensurePayment() {
        if (this.payment == null) {
            this.payment = new Payment();
            this.payment.setId(UUID.randomUUID().toString());
            this.payment.setServiceRequest(this);
            this.payment.setTotalAmount(this.totalPrice != null ? this.totalPrice : 0.0);
            this.payment.setPaymentStatus("Unpaid");
        }
        return this.payment;
    }

    public String getPaymentStatus() {
        return payment != null ? payment.getPaymentStatus() : "Unpaid";
    }
    public void setPaymentStatus(String paymentStatus) {
        ensurePayment().setPaymentStatus(paymentStatus);
    }

    public String getSlipTransRef() {
        return payment != null ? payment.getTransactionId() : null;
    }
    public void setSlipTransRef(String slipTransRef) {
        ensurePayment().setTransactionId(slipTransRef);
    }

    public LocalDateTime getPaidAt() {
        return payment != null ? payment.getPaidDateTime() : null;
    }
    public void setPaidAt(LocalDateTime paidAt) {
        ensurePayment().setPaidDateTime(paidAt);
    }

    // --- UML Methods (Class Diagram) ---

    public void updateStatus(String newStatus) {
        this.status = newStatus;
    }

    public void cancelRequest() {
        this.status = "Cancelled";
    }
}
