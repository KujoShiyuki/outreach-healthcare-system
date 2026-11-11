package com.nursingcare.backend.repository;

import com.nursingcare.backend.entity.CareRecords;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CareRecordsRepository extends JpaRepository<CareRecords, String> {
    Optional<CareRecords> findByServiceRequest_Id(String serviceRequestId);
    List<CareRecords> findByServiceRequest_IdOrderByVisitDateDesc(String serviceRequestId);
    Optional<CareRecords> findByServiceRequest_IdAndVisitDate(String serviceRequestId, java.time.LocalDate visitDate);

    @Query("""
            select cr from CareRecords cr
            where cr.serviceRequest.patient.id = :patientId
              and cr.serviceRequest.nurse.id = :nurseId
            order by cr.visitDate desc
            """)
    List<CareRecords> findAccessibleByPatientAndNurse(@Param("patientId") String patientId,
                                                     @Param("nurseId") String nurseId);
}
