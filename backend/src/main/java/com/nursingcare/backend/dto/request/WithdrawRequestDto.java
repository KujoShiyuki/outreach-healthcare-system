package com.nursingcare.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class WithdrawRequestDto {

    @NotBlank(message = "กรุณาระบุรหัสคำขอรับบริการ")
    private String service_request_id;

    @NotNull(message = "กรุณาระบุจำนวนเงิน")
    private Double amount;

    public WithdrawRequestDto() {}

    public WithdrawRequestDto(String service_request_id, Double amount) {
        this.service_request_id = service_request_id;
        this.amount = amount;
    }

    public String getService_request_id() {
        return service_request_id;
    }

    public void setService_request_id(String service_request_id) {
        this.service_request_id = service_request_id;
    }

    public String getServiceRequestId() {
        return service_request_id;
    }

    public void setServiceRequestId(String serviceRequestId) {
        this.service_request_id = serviceRequestId;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }
}
