package com.nursingcare.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @Column(name = "payment_id", length = 36)
    private String id;

    @Column(name = "transaction_id", length = 100)
    private String transactionId;

    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "service_id", referencedColumnName = "request_id", nullable = false)
    private ServiceRequest serviceRequest;

    @Column(name = "service_fee")
    private Double serviceFee;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount;

    @Column(name = "payment_status", length = 50, nullable = false)
    private String paymentStatus = "Unpaid"; // Unpaid, Paid, Failed, Refunded

    @Column(name = "paid_date_time")
    private LocalDateTime paidDateTime;

    @OneToOne(mappedBy = "payment", cascade = CascadeType.ALL)
    private Receipt receipt;

    public Payment() {}

    // --- Getters & Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTransactionId() { return transactionId != null ? transactionId : id; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public ServiceRequest getServiceRequest() { return serviceRequest; }
    public void setServiceRequest(ServiceRequest serviceRequest) { this.serviceRequest = serviceRequest; }

    public Double getServiceFee() { return serviceFee; }
    public void setServiceFee(Double serviceFee) { this.serviceFee = serviceFee; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public LocalDateTime getPaidDateTime() { return paidDateTime; }
    public void setPaidDateTime(LocalDateTime paidDateTime) { this.paidDateTime = paidDateTime; }

    public Receipt getReceipt() { return receipt; }
    public void setReceipt(Receipt receipt) { this.receipt = receipt; }

    // --- UML Method ---

    public void processPayment() {
        this.paymentStatus = "Paid";
        this.paidDateTime = LocalDateTime.now();
    }
}
