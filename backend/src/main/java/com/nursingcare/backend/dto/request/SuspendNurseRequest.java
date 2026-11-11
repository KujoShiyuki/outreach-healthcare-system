package com.nursingcare.backend.dto.request;
public class SuspendNurseRequest {
    private String status = "Suspended";
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}