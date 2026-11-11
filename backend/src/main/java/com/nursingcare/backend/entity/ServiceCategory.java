package com.nursingcare.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "service_categories")
public class ServiceCategory {

    @Id
    @Column(name = "category_id", length = 36)
    private String id;

    @Column(name = "category_name", length = 150, nullable = false)
    private String categoryName;

    @Column(name = "category_group", length = 100)
    private String categoryGroup;

    @Column(name = "required_certification", length = 100)
    private String requiredCertification;

    @Column(name = "is_specialized")
    private Boolean isSpecialized = false;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JsonIgnore
    @OneToMany(mappedBy = "serviceCategory", cascade = CascadeType.ALL)
    private List<ServicePackage> servicePackages = new ArrayList<>();

    public ServiceCategory() {}

    // --- Getters & Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCategoryId() { return id; }
    public void setCategoryId(String categoryId) { this.id = categoryId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getCategoryGroup() { return categoryGroup; }
    public void setCategoryGroup(String categoryGroup) { this.categoryGroup = categoryGroup; }

    public String getRequiredCertification() { return requiredCertification; }
    public void setRequiredCertification(String requiredCertification) { this.requiredCertification = requiredCertification; }

    public Boolean getIsSpecialized() { return isSpecialized; }
    public void setIsSpecialized(Boolean isSpecialized) { this.isSpecialized = isSpecialized; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<ServicePackage> getServicePackages() { return servicePackages; }
    public void setServicePackages(List<ServicePackage> servicePackages) { this.servicePackages = servicePackages; }
}
