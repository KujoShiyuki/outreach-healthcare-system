package com.nursingcare.backend.repository;

import com.nursingcare.backend.entity.Nurse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NurseRepository extends JpaRepository<Nurse, String> {
    java.util.Optional<Nurse> findByUser_Id(String userId);
}
