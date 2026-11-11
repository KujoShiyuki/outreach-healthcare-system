package com.nursingcare.backend.repository;

import com.nursingcare.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    java.util.Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
