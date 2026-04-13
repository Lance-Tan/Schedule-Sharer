package com.schedulink.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleSummaryDto {
    private Long scheduleId;
    private String name;
    private boolean active;
}
