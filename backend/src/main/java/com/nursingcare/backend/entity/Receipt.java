package com.nursingcare.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "receipts")
public class Receipt {

    @Id
    @Column(name = "receipt_id", length = 50)
    private String id;

    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "payment_id", referencedColumnName = "payment_id", nullable = false)
    private Payment payment;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate = LocalDate.now();

    @Column(name = "service_description", columnDefinition = "TEXT")
    private String serviceDescription;

    @Column(name = "final_amount", nullable = false)
    private Double finalAmount;

    public Receipt() {}

    // --- Getters & Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getReceiptId() { return id; }
    public void setReceiptId(String receiptId) { this.id = receiptId; }

    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }

    public LocalDate getIssueDate() { return issueDate; }
    public void setIssueDate(LocalDate issueDate) { this.issueDate = issueDate; }

    public String getServiceDescription() { return serviceDescription; }
    public void setServiceDescription(String serviceDescription) { this.serviceDescription = serviceDescription; }

    public Double getFinalAmount() { return finalAmount; }
    public void setFinalAmount(Double finalAmount) { this.finalAmount = finalAmount; }

    // --- UML Method ---

    public String generateReceipt() {
        return String.format("RECEIPT #%s | Date: %s | Description: %s | Total: %.2f THB",
                id, issueDate, serviceDescription, finalAmount);
    }
}
