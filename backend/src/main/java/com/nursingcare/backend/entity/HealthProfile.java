package com.nursingcare.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "health_profiles")
public class HealthProfile {

    @Id
    @Column(name = "health_profile_id", length = 36)
    private String id;

    @OneToOne
    @JoinColumn(name = "patient_id", referencedColumnName = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "blood_type", length = 5)
    private String bloodType;

    @Column(name = "congenital_disease", columnDefinition = "TEXT")
    private String congenitalDisease;

    @Column(name = "vision_ability", length = 50)
    private String visionAbility;

    @Column(name = "hearing_ability", length = 50)
    private String hearingAbility;

    // เพิ่มฟิลด์ที่ขาดให้ตรงกับ SRS 3.1.5
    @Column(name = "consciousness", length = 50)
    private String consciousness;

    @Column(name = "chief_complaint", columnDefinition = "TEXT")
    private String chiefComplaint;

    @Column(name = "current_assistance", columnDefinition = "TEXT")
    private String currentAssistance;

    @Column(name = "adl_score", length = 50)
    private String adlScore;

    @Column(name = "elimination", columnDefinition = "TEXT")
    private String elimination;

    @Column(name = "laxative_use", columnDefinition = "TEXT")
    private String laxativeUse;

    @Column(name = "mood", columnDefinition = "TEXT")
    private String mood;

    @Column(name = "food_allergy", columnDefinition = "TEXT")
    private String foodAllergy;

    @Column(name = "drug_allergy", columnDefinition = "TEXT")
    private String drugAllergy;

    @Column(name = "dietary_restrictions", columnDefinition = "TEXT")
    private String dietaryRestrictions;

    @Column(name = "special_nutritional_need", columnDefinition = "TEXT")
    private String specialNutritionalNeed;

    public HealthProfile() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getHealthProfileId() { return id; }
    public void setHealthProfileId(String healthProfileId) { this.id = healthProfileId; }

    public Patient getPatient() { return patient; }
    public void setPatient(Patient patient) { this.patient = patient; }

    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }

    public String getCongenitalDisease() { return congenitalDisease; }
    public void setCongenitalDisease(String congenitalDisease) { this.congenitalDisease = congenitalDisease; }

    public String getVisionAbility() { return visionAbility; }
    public void setVisionAbility(String visionAbility) { this.visionAbility = visionAbility; }

    public String getHearingAbility() { return hearingAbility; }
    public void setHearingAbility(String hearingAbility) { this.hearingAbility = hearingAbility; }

    public String getConsciousness() { return consciousness; }
    public void setConsciousness(String consciousness) { this.consciousness = consciousness; }

    public String getChiefComplaint() { return chiefComplaint; }
    public void setChiefComplaint(String chiefComplaint) { this.chiefComplaint = chiefComplaint; }

    public String getCurrentAssistance() { return currentAssistance; }
    public void setCurrentAssistance(String currentAssistance) { this.currentAssistance = currentAssistance; }

    public String getAdlScore() { return adlScore; }
    public void setAdlScore(String adlScore) { this.adlScore = adlScore; }

    public String getElimination() { return elimination; }
    public void setElimination(String elimination) { this.elimination = elimination; }

    public String getLaxativeUse() { return laxativeUse; }
    public void setLaxativeUse(String laxativeUse) { this.laxativeUse = laxativeUse; }

    public String getMood() { return mood; }
    public void setMood(String mood) { this.mood = mood; }

    public String getFoodAllergy() { return foodAllergy; }
    public void setFoodAllergy(String foodAllergy) { this.foodAllergy = foodAllergy; }

    public String getDrugAllergy() { return drugAllergy; }
    public void setDrugAllergy(String drugAllergy) { this.drugAllergy = drugAllergy; }

    public String getDietaryRestrictions() { return dietaryRestrictions; }
    public void setDietaryRestrictions(String dietaryRestrictions) { this.dietaryRestrictions = dietaryRestrictions; }

    public String getSpecialNutritionalNeed() { return specialNutritionalNeed; }
    public void setSpecialNutritionalNeed(String specialNutritionalNeed) { this.specialNutritionalNeed = specialNutritionalNeed; }

    // UML Aliases & Methods
    public String getMoodStatus() { return mood; }
    public void setMoodStatus(String moodStatus) { this.mood = moodStatus; }

    public String getDietaryRestriction() { return dietaryRestrictions; }
    public void setDietaryRestriction(String dietaryRestriction) { this.dietaryRestrictions = dietaryRestriction; }

    public void updateHealthProfile(HealthProfile updated) {
        if (updated == null) return;
        if (updated.getBloodType() != null) this.bloodType = updated.getBloodType();
        if (updated.getCongenitalDisease() != null) this.congenitalDisease = updated.getCongenitalDisease();
        if (updated.getVisionAbility() != null) this.visionAbility = updated.getVisionAbility();
        if (updated.getHearingAbility() != null) this.hearingAbility = updated.getHearingAbility();
        if (updated.getChiefComplaint() != null) this.chiefComplaint = updated.getChiefComplaint();
        if (updated.getCurrentAssistance() != null) this.currentAssistance = updated.getCurrentAssistance();
        if (updated.getFoodAllergy() != null) this.foodAllergy = updated.getFoodAllergy();
        if (updated.getDrugAllergy() != null) this.drugAllergy = updated.getDrugAllergy();
        if (updated.getDietaryRestrictions() != null) this.dietaryRestrictions = updated.getDietaryRestrictions();
        if (updated.getSpecialNutritionalNeed() != null) this.specialNutritionalNeed = updated.getSpecialNutritionalNeed();
        if (updated.getMood() != null) this.mood = updated.getMood();
    }
}
