package com.nursingcare.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "admins")
public class Admin {

    @Id
    @Column(name = "admin_id", length = 36)
    private String id;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private User user;

    public Admin() {}

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

    // UML Methods
    public void searchNurseAccount() {}
    public void suspendNurseAccount() {}
    public void viewSettlementReport() {}
}
