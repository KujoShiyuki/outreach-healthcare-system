package com.nursingcare.backend.dto.request;
import jakarta.validation.constraints.NotBlank;
public class VerifyNurseRequest {
    @NotBlank private String decision;
    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }
}