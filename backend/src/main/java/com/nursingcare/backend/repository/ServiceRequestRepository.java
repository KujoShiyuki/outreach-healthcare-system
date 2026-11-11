package com.nursingcare.backend.repository;

import com.nursingcare.backend.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, String> {
    @Query("SELECT COUNT(p) > 0 FROM Payment p WHERE p.transactionId = :slipTransRef")
    boolean existsBySlipTransRef(@Param("slipTransRef") String slipTransRef);

    /**
     * ค้นหาคำขอบริการของพยาบาลตามรายการสถานะ (เช่น งานที่กำลังทำอยู่ หรือยังไม่เสร็จสิ้น)
     */
    List<ServiceRequest> findByNurseIdAndStatusIn(String nurseId, List<String> statuses);
}
