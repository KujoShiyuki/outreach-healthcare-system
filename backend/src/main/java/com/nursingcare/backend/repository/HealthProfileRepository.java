package com.nursingcare.backend.repository;

import com.nursingcare.backend.entity.HealthProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HealthProfileRepository extends JpaRepository<HealthProfile, String> {
    Optional<HealthProfile> findByPatient_Id(String patientId);
}
