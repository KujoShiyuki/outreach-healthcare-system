package com.nursingcare.backend.service;

import com.nursingcare.backend.entity.Nurse;

import java.time.LocalDate;
import java.util.List;

public interface ShiftMatchingService {
    void validateRoster(Nurse nurse, List<LocalDate> requestedDates, String requestedShift);
}
