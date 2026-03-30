package com.schedulink.backend.dto;

import lombok.Data;

import java.time.LocalTime;

@Data
public class TimeslotDto {
    private String day;
    private LocalTime startTime;
    private LocalTime endTime;
}
