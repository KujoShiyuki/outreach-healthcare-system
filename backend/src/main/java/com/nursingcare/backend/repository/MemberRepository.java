package com.nursingcare.backend.repository;

import com.nursingcare.backend.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemberRepository extends JpaRepository<Member, String> {
    java.util.Optional<Member> findByUser_Id(String userId);
}
