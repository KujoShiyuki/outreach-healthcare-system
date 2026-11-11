package com.nursingcare.backend.service;

import com.nursingcare.backend.entity.HealthProfile;

import java.util.Map;

public interface ClinicalMatchingService {
    Map<String, Object> assessHealthProfile(HealthProfile healthProfile);
}
