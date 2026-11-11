package com.nursingcare.backend.dto.request;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class CareRecordDto {
    @NotNull private LocalDate visit_date;
    private String blood_pressure;
    @Min(30) @Max(220) private Integer heart_rate;
    @DecimalMin("30.0") @DecimalMax("45.0") private Double body_temperature;
    @Min(5) @Max(60) private Integer respiratory_rate;
    @Min(50) @Max(100) private Integer oxygen_saturation;
    @Min(0) @Max(10) private Integer pain_score;
    private String pain_location;
    private String medication_record;
    private String symptom_summary;
    private String consciousness;
    private Double weight;
    private String excretion;
    private String patient_condition;
    private String care_given;
    private LocalDateTime check_in_time;
    private LocalDateTime check_out_time;
    private LocalDate follow_up_date;
    @jakarta.validation.constraints.Size(max = 7000000)
    private String care_image_url;

    public LocalDate getVisit_date() { return visit_date; }
    public void setVisit_date(LocalDate visit_date) { this.visit_date = visit_date; }
    public String getBlood_pressure() { return blood_pressure; }
    public void setBlood_pressure(String blood_pressure) { this.blood_pressure = blood_pressure; }
    public Integer getHeart_rate() { return heart_rate; }
    public void setHeart_rate(Integer heart_rate) { this.heart_rate = heart_rate; }
    public Double getBody_temperature() { return body_temperature; }
    public void setBody_temperature(Double body_temperature) { this.body_temperature = body_temperature; }
    public Integer getRespiratory_rate() { return respiratory_rate; }
    public void setRespiratory_rate(Integer respiratory_rate) { this.respiratory_rate = respiratory_rate; }
    public Integer getOxygen_saturation() { return oxygen_saturation; }
    public void setOxygen_saturation(Integer oxygen_saturation) { this.oxygen_saturation = oxygen_saturation; }
    public Integer getPain_score() { return pain_score; }
    public void setPain_score(Integer pain_score) { this.pain_score = pain_score; }
    public String getPain_location() { return pain_location; }
    public void setPain_location(String pain_location) { this.pain_location = pain_location; }
    public String getMedication_record() { return medication_record; }
    public void setMedication_record(String medication_record) { this.medication_record = medication_record; }
    public String getSymptom_summary() { return symptom_summary; }
    public void setSymptom_summary(String symptom_summary) { this.symptom_summary = symptom_summary; }
    public String getConsciousness() { return consciousness; }
    public void setConsciousness(String consciousness) { this.consciousness = consciousness; }
    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }
    public String getExcretion() { return excretion; }
    public void setExcretion(String excretion) { this.excretion = excretion; }
    public String getPatient_condition() { return patient_condition; }
    public void setPatient_condition(String patient_condition) { this.patient_condition = patient_condition; }
    public String getCare_given() { return care_given; }
    public void setCare_given(String care_given) { this.care_given = care_given; }
    public LocalDateTime getCheck_in_time() { return check_in_time; }
    public void setCheck_in_time(LocalDateTime check_in_time) { this.check_in_time = check_in_time; }
    public LocalDateTime getCheck_out_time() { return check_out_time; }
    public void setCheck_out_time(LocalDateTime check_out_time) { this.check_out_time = check_out_time; }
    public LocalDate getFollow_up_date() { return follow_up_date; }
    public void setFollow_up_date(LocalDate follow_up_date) { this.follow_up_date = follow_up_date; }
    public String getCare_image_url() { return care_image_url; }
    public void setCare_image_url(String care_image_url) { this.care_image_url = care_image_url; }
}