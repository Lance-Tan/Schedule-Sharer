package com.schedulink.backend.dto;

import lombok.Data;

@Data
public class RenameScheduleRequest {
    private Long userId;
    private String name;
}
