package com.nursingcare.backend.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
public class ChangePasswordRequest {
    @NotBlank private String old_password;
    @NotBlank
    @Pattern(regexp = "^(?=.*[A-Z])(?=.*\\d).{8,}$", message = "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่และตัวเลข")
    private String new_password;
    public String getOld_password() { return old_password; }
    public void setOld_password(String old_password) { this.old_password = old_password; }
    public String getNew_password() { return new_password; }
    public void setNew_password(String new_password) { this.new_password = new_password; }
}