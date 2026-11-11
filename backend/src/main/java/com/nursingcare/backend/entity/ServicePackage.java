package com.nursingcare.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "service_packages")
public class ServicePackage {

    @Id
    @Column(name = "package_id", length = 36)
    private String id;

    @Column(name = "package_name", length = 150, nullable = false)
    private String packageName;

    @Column(name = "subscription_type", length = 50)
    private String subscriptionType;

    @Column(name = "price_per_cycle")
    private Double pricePerCycle;

    @Column(name = "price_per_month")
    private Double pricePerMonth;

    @Column(name = "cycles_per_month")
    private Integer cyclesPerMonth;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne
    @JoinColumn(name = "category_id", referencedColumnName = "category_id")
    private ServiceCategory serviceCategory;

    public ServicePackage() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPackageId() { return id; }
    public void setPackageId(String packageId) { this.id = packageId; }

    public String getPackageName() { return packageName; }
    public void setPackageName(String packageName) { this.packageName = packageName; }

    public String getSubscriptionType() { return subscriptionType; }
    public void setSubscriptionType(String subscriptionType) { this.subscriptionType = subscriptionType; }

    public Double getPricePerCycle() { return pricePerCycle; }
    public void setPricePerCycle(Double pricePerCycle) { this.pricePerCycle = pricePerCycle; }

    public Double getPricePerMonth() { return pricePerMonth; }
    public void setPricePerMonth(Double pricePerMonth) { this.pricePerMonth = pricePerMonth; }

    public Integer getCyclesPerMonth() { return cyclesPerMonth; }
    public void setCyclesPerMonth(Integer cyclesPerMonth) { this.cyclesPerMonth = cyclesPerMonth; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ServiceCategory getServiceCategory() { return serviceCategory; }
    public void setServiceCategory(ServiceCategory serviceCategory) { this.serviceCategory = serviceCategory; }

    // UML Aliases
    public Double getPricePerSession() { return pricePerCycle; }
    public void setPricePerSession(Double pricePerSession) { this.pricePerCycle = pricePerSession; }

    public Integer getTotalSessionPerMonth() { return cyclesPerMonth; }
    public void setTotalSessionPerMonth(Integer totalSessionPerMonth) { this.cyclesPerMonth = totalSessionPerMonth; }
}
