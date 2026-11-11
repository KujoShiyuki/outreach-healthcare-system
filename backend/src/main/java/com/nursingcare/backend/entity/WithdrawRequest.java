package com.nursingcare.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "withdraw_requests")
public class WithdrawRequest {

    @Id
    @Column(name = "withdraw_id", length = 36)
    private String id;

    @ManyToOne
    @JoinColumn(name = "nurse_id", referencedColumnName = "nurse_id", nullable = false)
    private Nurse nurse;

    @ManyToOne
    @JoinColumn(name = "service_request_id", referencedColumnName = "request_id")
    private ServiceRequest serviceRequest;

    @Column(nullable = false)
    private Double amount;

    @Column(name = "bank_account_number", length = 20)
    private String bankAccountNumber;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(length = 50)
    private String status = "Pending"; // Pending, Approved, Rejected, Transferred

    @Column(name = "transfer_slip_url", columnDefinition = "LONGTEXT")
    private String transferSlipUrl;

    @Column(name = "requested_at", updatable = false)
    private LocalDateTime requestedAt = LocalDateTime.now();

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    public WithdrawRequest() {}

    // --- Getters & Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Nurse getNurse() { return nurse; }
    public void setNurse(Nurse nurse) { this.nurse = nurse; }

    public ServiceRequest getServiceRequest() { return serviceRequest; }
    public void setServiceRequest(ServiceRequest serviceRequest) { this.serviceRequest = serviceRequest; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getBankAccountNumber() { return bankAccountNumber; }
    public void setBankAccountNumber(String bankAccountNumber) { this.bankAccountNumber = bankAccountNumber; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTransferSlipUrl() { return transferSlipUrl; }
    public void setTransferSlipUrl(String transferSlipUrl) { this.transferSlipUrl = transferSlipUrl; }

    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }

    public LocalDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(LocalDateTime processedAt) { this.processedAt = processedAt; }

    // UML Aliases & Methods
    public String getWithdrawId() { return id; }
    public void setWithdrawId(String withdrawId) { this.id = withdrawId; }

    public LocalDateTime getRequestDate() { return requestedAt; }
    public void setRequestDate(LocalDateTime requestDate) { this.requestedAt = requestDate; }

    public LocalDateTime getTransferDate() { return processedAt; }
    public void setTransferDate(LocalDateTime transferDate) { this.processedAt = transferDate; }

    public void submitWithdraw(Nurse nurse, Double amount, String bankAccountNumber) {
        this.nurse = nurse;
        this.amount = amount;
        this.bankAccountNumber = bankAccountNumber;
        this.status = "Pending";
        this.requestedAt = LocalDateTime.now();
    }

    public void approveTransfer(String transferSlipUrl) {
        this.transferSlipUrl = transferSlipUrl;
        this.status = "Transferred";
        this.processedAt = LocalDateTime.now();
    }
}
