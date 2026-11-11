package com.nursingcare.backend.repository;

import com.nursingcare.backend.entity.NurseLicense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NurseLicenseRepository extends JpaRepository<NurseLicense, String> {
    Optional<NurseLicense> findByNurse_Id(String nurseId);
}
