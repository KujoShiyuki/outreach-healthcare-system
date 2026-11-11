package com.nursingcare.backend.repository;

import com.nursingcare.backend.entity.WithdrawRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WithdrawRequestRepository extends JpaRepository<WithdrawRequest, String> {
    List<WithdrawRequest> findByNurse_IdOrderByRequestedAtDesc(String nurseId);
    List<WithdrawRequest> findByStatusOrderByRequestedAtAsc(String status);
    boolean existsByServiceRequest_Id(String serviceRequestId);
    Optional<WithdrawRequest> findByServiceRequest_Id(String serviceRequestId);
    List<WithdrawRequest> findByNurse_Id(String nurseId);
}
