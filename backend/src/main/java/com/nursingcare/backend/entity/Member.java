package com.nursingcare.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "members")
public class Member {

    @Id
    @Column(name = "member_id", length = 36)
    private String id;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private User user;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String province;

    @Column(length = 100)
    private String district;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    public Member() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getFullname() {
        return user != null ? user.getFullname() : null;
    }
    public void setFullname(String fullname) {
        if (this.user != null) {
            this.user.setFullname(fullname);
        }
    }

    public String getSurname() {
        return user != null ? user.getSurname() : null;
    }
    public void setSurname(String surname) {
        if (this.user != null) {
            this.user.setSurname(surname);
        }
    }

    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

    public String getPhoneNumber() {
        return user != null ? user.getPhoneNumber() : null;
    }
    public void setPhoneNumber(String phoneNumber) {
        if (this.user != null) {
            this.user.setPhoneNumber(phoneNumber);
        }
    }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getProvince() { return province; }
    public void setProvince(String province) { this.province = province; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    // UML Methods
    public void register() {}
    public void addPatient() {}
    public void listPatient() {}
    public void requestService() {}
    public void viewServiceHistory() {}
}
