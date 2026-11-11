package com.nursingcare.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @Column(name = "user_id", length = 36)
    private String id;

    @Column(length = 100, nullable = false, unique = true)
    private String email;

    @Column(name = "password", length = 255, nullable = false)
    private String password;

    @Column(name = "user_status", length = 20)
    private String status = "Active"; // Active, Suspended

    @Column(length = 20, nullable = false)
    private String role;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(length = 100)
    private String fullname;

    @Column(length = 100)
    private String surname;

    public User() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getFullname() { return fullname; }
    public void setFullname(String fullname) { this.fullname = fullname; }

    public String getSurname() { return surname; }
    public void setSurname(String surname) { this.surname = surname; }

    // UML Aliases & Methods
    public String getUserId() { return id; }
    public void setUserId(String userId) { this.id = userId; }

    public String getUserStatus() { return status; }
    public void setUserStatus(String userStatus) { this.status = userStatus; }

    public void login() {}
    public void logout() {}
    public void editProfile(String fullname, String surname, String phoneNumber) {
        if (fullname != null) this.fullname = fullname;
        if (surname != null) this.surname = surname;
        if (phoneNumber != null) this.phoneNumber = phoneNumber;
    }
}
