package com.schedulink.backend.dto;

import lombok.Data;

@Data
public class SetActiveScheduleRequest {
    private Long userId;
    private Long scheduleId;
}
