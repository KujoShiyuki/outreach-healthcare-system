package com.nursingcare.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nursingcare.backend.entity.Nurse;
import com.nursingcare.backend.service.ShiftMatchingService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ShiftMatchingServiceImpl implements ShiftMatchingService {
    private final ObjectMapper objectMapper;

    public ShiftMatchingServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void validateRoster(Nurse nurse, List<LocalDate> requestedDates, String requestedShift) {
        if (nurse.getAvailabilityType() != null
                && "FLEXIBLE".equalsIgnoreCase(nurse.getAvailabilityType().name())) return;
        if (nurse.getShiftSchedule() == null || nurse.getShiftSchedule().isBlank()) return;

        try {
            JsonNode root = objectMapper.readTree(nurse.getShiftSchedule());
            JsonNode roster = root.path("hospital_code_schedule");
            for (LocalDate date : requestedDates) {
                JsonNode codeNode = roster
                        .path(String.format("%04d-%02d", date.getYear(), date.getMonthValue()))
                        .path(String.valueOf(date.getDayOfMonth()));
                if (codeNode.isMissingNode() || codeNode.asText().isBlank()) continue;

                String code = codeNode.asText();
                boolean unavailable = code.equals("หยุด") || code.equals("ด") || code.contains("/")
                        || code.equals("ชด") || code.startsWith("ดด") || code.length() > 2;
                boolean shiftConflict = requestedShift != null && (
                        ((code.equals("ช") || code.equals("ป"))
                                && (requestedShift.equals("morning_8h") || requestedShift.equals("day_12h")))
                        || (code.equals("บ")
                                && (requestedShift.equals("afternoon_8h") || requestedShift.equals("night_12h")))
                );
                if (unavailable || shiftConflict) {
                    throw new RuntimeException("ตารางเวรโรงพยาบาลชนกับวันที่ " + date + " หรือช่วงเวลาที่เลือก");
                }
            }
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new RuntimeException("ไม่สามารถอ่านตารางเวรโรงพยาบาลของพยาบาลได้");
        }
    }
}
