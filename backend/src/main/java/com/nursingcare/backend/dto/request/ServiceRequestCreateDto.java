package com.nursingcare.backend.dto.request;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class ServiceRequestCreateDto {
    @NotBlank private String patient_id;
    private String service_type_id;
    @NotBlank private String start_date;
    private java.time.LocalDate end_date;
    @NotBlank private String time_slot;
    @NotBlank private String service_address;
    private String package_id;
    private String nurse_id;
    private Integer service_count;
    private Double total_price;
    private String special_precautions;
    private String additional_notes;
    private Boolean is_complex_wound;
    private String wound_photo_url;
    private Double latitude;
    private Double longitude;
    private List<String> service_dates;

    public String getPatient_id() { return patient_id; }
    public void setPatient_id(String patient_id) { this.patient_id = patient_id; }
    public String getService_type_id() { return service_type_id; }
    public void setService_type_id(String service_type_id) { this.service_type_id = service_type_id; }
    public String getStart_date() { return start_date; }
    public void setStart_date(String start_date) { this.start_date = start_date; }
    public java.time.LocalDate getEnd_date() { return end_date; }
    public void setEnd_date(java.time.LocalDate end_date) { this.end_date = end_date; }
    public String getTime_slot() { return time_slot; }
    public void setTime_slot(String time_slot) { this.time_slot = time_slot; }
    public String getService_address() { return service_address; }
    public void setService_address(String service_address) { this.service_address = service_address; }
    public String getPackage_id() { return package_id; }
    public void setPackage_id(String package_id) { this.package_id = package_id; }
    public String getNurse_id() { return nurse_id; }
    public void setNurse_id(String nurse_id) { this.nurse_id = nurse_id; }
    public Integer getService_count() { return service_count; }
    public void setService_count(Integer service_count) { this.service_count = service_count; }
    public Double getTotal_price() { return total_price; }
    public void setTotal_price(Double total_price) { this.total_price = total_price; }
    public String getSpecial_precautions() { return special_precautions; }
    public void setSpecial_precautions(String special_precautions) { this.special_precautions = special_precautions; }
    public String getAdditional_notes() { return additional_notes; }
    public void setAdditional_notes(String additional_notes) { this.additional_notes = additional_notes; }
    public Boolean getIs_complex_wound() { return is_complex_wound; }
    public void setIs_complex_wound(Boolean is_complex_wound) { this.is_complex_wound = is_complex_wound; }
    public String getWound_photo_url() { return wound_photo_url; }
    public void setWound_photo_url(String wound_photo_url) { this.wound_photo_url = wound_photo_url; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public List<String> getService_dates() { return service_dates; }
    public void setService_dates(List<String> service_dates) { this.service_dates = service_dates; }
}