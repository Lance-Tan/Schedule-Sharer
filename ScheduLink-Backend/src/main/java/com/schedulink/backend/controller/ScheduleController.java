package com.schedulink.backend.controller;

import com.schedulink.backend.dto.EventDto;
import com.schedulink.backend.dto.TimeslotDto;
import com.schedulink.backend.model.Event;
import com.schedulink.backend.model.Schedule;
import com.schedulink.backend.model.Timeslot;
import com.schedulink.backend.model.User;
import com.schedulink.backend.repository.EventRepository;
import com.schedulink.backend.repository.ScheduleRepository;
import com.schedulink.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/schedules")
@CrossOrigin("*")
public class ScheduleController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private EventRepository eventRepository;

    // Upload a schedule from an ICS file
    @PostMapping("/upload")
    public ResponseEntity<?> uploadSchedule(@RequestParam("userId") Long userId, @RequestParam("file") MultipartFile file) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        User user = userOpt.get();

        Schedule schedule = scheduleRepository.findFirstByUserOrderByIdAsc(user)
                .orElseGet(() -> {
                    Schedule s = new Schedule();
                    s.setUser(user);
                    s.setScheduleName("Imported schedule");
                    return scheduleRepository.save(s);
                });
        schedule.getEvents().clear();
        scheduleRepository.save(schedule);

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean inEvent = false;
            String summary = null;
            String dtStart = null;
            String dtEnd = null;
            String byDay = null;

            while ((line = reader.readLine()) != null) {
                if (line.startsWith("BEGIN:VEVENT")) {
                    inEvent = true;
                    summary = null;
                    dtStart = null;
                    dtEnd = null;
                    byDay = null;
                } else if (line.startsWith("END:VEVENT") && inEvent) {
                    inEvent = false;
                    if (summary != null && dtStart != null && dtEnd != null) {
                        addEventFromIcs(schedule, summary, dtStart, dtEnd, byDay != null ? byDay : "TBD");
                    }
                } else if (inEvent) {
                    if (line.startsWith("SUMMARY:")) summary = line.substring(8);
                    else if (line.startsWith("DTSTART;TZID=") || line.startsWith("DTSTART:")) {
                        dtStart = extractTime(line);
                    } else if (line.startsWith("DTEND;TZID=") || line.startsWith("DTEND:")) {
                        dtEnd = extractTime(line);
                    } else if (line.startsWith("RRULE:")) {
                        String[] parts = line.split(";");
                        for (String part : parts) {
                            if (part.startsWith("BYDAY=")) byDay = part.substring(6);
                        }
                    }
                }
            }
            scheduleRepository.save(schedule);
            return ResponseEntity.ok(Map.of("message", "Schedule uploaded successfully"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Error parsing file"));
        }
    }

    // Get a schedule by user ID
    @GetMapping("/{userId}")
    public ResponseEntity<?> getSchedule(@PathVariable Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }

        List<Event> events = eventRepository.findWithTimeslotsByUserId(userId);
        List<EventDto> body = events.stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(body);
    }

    // Convert an Event to a DTO
    private EventDto toDto(Event e) {
        EventDto dto = new EventDto();
        dto.setEventId(e.getId());
        dto.setEventName(e.getEventName());
        dto.setTimeslots(
                e.getTimeslots().stream()
                        .map(t -> {
                            TimeslotDto td = new TimeslotDto();
                            td.setDay(t.getDay());
                            td.setStartTime(t.getStartTime());
                            td.setEndTime(t.getEndTime());
                            return td;
                        })
                        .collect(Collectors.toList()));
        return dto;
    }

    // Add an event from an ICS file
    private void addEventFromIcs(Schedule schedule, String summary, String dtStart, String dtEnd, String daysCsv) {
        LocalTime startTime = parseTime(dtStart);
        LocalTime endTime = parseTime(dtEnd);
        String name = summary != null ? summary.trim() : "Untitled";

        Event event = new Event();
        event.setSchedule(schedule);
        event.setEventName(name);
        schedule.getEvents().add(event);

        for (String part : daysCsv.split(",")) {
            String day = part.trim();
            if (day.isEmpty()) {
                continue;
            }
            Timeslot slot = new Timeslot();
            slot.setEvent(event);
            slot.setDay(day);
            slot.setStartTime(startTime);
            slot.setEndTime(endTime);
            event.getTimeslots().add(slot);
        }
    }

    // Extract the time from an ICS line
    private String extractTime(String line) {
        int idx = line.indexOf(':');
        if (idx != -1 && line.length() > idx + 1) {
            return line.substring(idx + 1);
        }
        return "";
    }

    // Parse the time from an ICS string
    private LocalTime parseTime(String dtStr) {
        try {
            int tIdx = dtStr.indexOf('T');
            if (tIdx != -1 && dtStr.length() >= tIdx + 7) {
                String timePart = dtStr.substring(tIdx + 1, tIdx + 7);
                return LocalTime.parse(timePart, DateTimeFormatter.ofPattern("HHmmss"));
            }
        } catch (Exception e) {
        }
        return LocalTime.MIDNIGHT;
    }
}
