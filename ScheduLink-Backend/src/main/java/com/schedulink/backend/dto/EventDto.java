package com.schedulink.backend.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class EventDto {
    private Long eventId;
    private String eventName;
    private List<TimeslotDto> timeslots = new ArrayList<>();
}
