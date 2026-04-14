package com.schedulink.backend.dto;

import lombok.Data;

@Data
public class CreateScheduleRequest {
    private Long userId;
    private String name;
}
