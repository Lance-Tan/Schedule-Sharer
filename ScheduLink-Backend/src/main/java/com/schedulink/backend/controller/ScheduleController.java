package com.schedulink.backend.controller;



import com.schedulink.backend.dto.CreateScheduleRequest;

import com.schedulink.backend.dto.EventDto;

import com.schedulink.backend.dto.ScheduleSummaryDto;

import com.schedulink.backend.dto.SetActiveScheduleRequest;

import com.schedulink.backend.dto.RenameScheduleRequest;

import com.schedulink.backend.dto.TimeslotDto;

import com.schedulink.backend.model.Event;

import com.schedulink.backend.model.Friendship;

import com.schedulink.backend.model.Schedule;

import com.schedulink.backend.model.Timeslot;

import com.schedulink.backend.model.User;

import com.schedulink.backend.model.ScheduleGroup;
import com.schedulink.backend.model.ScheduleGroupMember;

import com.schedulink.backend.repository.EventRepository;

import com.schedulink.backend.repository.FriendshipRepository;

import com.schedulink.backend.repository.ScheduleGroupMemberRepository;

import com.schedulink.backend.repository.ScheduleGroupRepository;

import com.schedulink.backend.repository.ScheduleRepository;

import com.schedulink.backend.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.http.ResponseEntity;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.multipart.MultipartFile;



import java.io.BufferedReader;

import java.io.InputStreamReader;

import java.time.LocalTime;

import java.time.format.DateTimeFormatter;

import java.util.List;

import java.util.Map;

import java.util.ArrayList;

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



    @Autowired

    private FriendshipRepository friendshipRepository;



    @Autowired

    private ScheduleGroupRepository scheduleGroupRepository;



    @Autowired

    private ScheduleGroupMemberRepository scheduleGroupMemberRepository;

    @GetMapping("/list")

    @Transactional(readOnly = true)

    public ResponseEntity<?> listSchedules(@RequestParam Long userId) {

        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));

        }

        User user = userOpt.get();

        Schedule active = user.getActiveSchedule();

        Long activeId = active != null ? active.getId() : null;



        List<ScheduleSummaryDto> body = scheduleRepository.findByUserOrderByIdAsc(user).stream()

                .map(s -> new ScheduleSummaryDto(s.getId(), s.getScheduleName(),

                        activeId != null && activeId.equals(s.getId())))

                .collect(Collectors.toList());

        return ResponseEntity.ok(body);

    }

    @PostMapping("/create")

    public ResponseEntity<?> createSchedule(@RequestBody CreateScheduleRequest body) {

        if (body == null || body.getUserId() == null) {

            return ResponseEntity.badRequest().body(Map.of("error", "userId is required"));

        }

        String name = body.getName() == null || body.getName().isBlank() ? "New schedule" : body.getName().trim();

        Optional<User> userOpt = userRepository.findById(body.getUserId());

        if (userOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));

        }

        User user = userOpt.get();

        Schedule s = new Schedule();

        s.setUser(user);

        s.setScheduleName(name);

        s = scheduleRepository.save(s);

        if (user.getActiveSchedule() == null) {

            user.setActiveSchedule(s);

            userRepository.save(user);

        }

        return ResponseEntity.ok(Map.of(

                "scheduleId", s.getId(),

                "name", s.getScheduleName(),

                "message", "Schedule created"

        ));

    }



    @PostMapping("/set-active")

    @Transactional

    public ResponseEntity<?> setActiveSchedule(@RequestBody SetActiveScheduleRequest body) {

        if (body == null || body.getUserId() == null || body.getScheduleId() == null) {

            return ResponseEntity.badRequest().body(Map.of("error", "userId and scheduleId are required"));

        }

        Optional<User> userOpt = userRepository.findById(body.getUserId());

        if (userOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));

        }

        User user = userOpt.get();

        Optional<Schedule> schOpt = scheduleRepository.findByIdAndUser_Id(body.getScheduleId(), user.getId());

        if (schOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "Schedule not found"));

        }

        user.setActiveSchedule(schOpt.get());

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Active schedule updated"));

    }



    @PatchMapping("/{scheduleId}")

    @Transactional

    public ResponseEntity<?> renameSchedule(@PathVariable Long scheduleId, @RequestBody RenameScheduleRequest body) {

        if (body == null || body.getUserId() == null) {

            return ResponseEntity.badRequest().body(Map.of("error", "userId is required"));

        }

        String name = body.getName() == null ? "" : body.getName().trim();

        if (name.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "name must not be empty"));

        }

        Optional<User> userOpt = userRepository.findById(body.getUserId());

        if (userOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));

        }

        User user = userOpt.get();

        Optional<Schedule> schOpt = scheduleRepository.findByIdAndUser_Id(scheduleId, user.getId());

        if (schOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "Schedule not found"));

        }

        Schedule sch = schOpt.get();

        sch.setScheduleName(name);

        scheduleRepository.save(sch);

        return ResponseEntity.ok(Map.of("message", "Schedule renamed", "name", name));

    }



    @DeleteMapping("/{scheduleId}")

    @Transactional

    public ResponseEntity<?> deleteSchedule(@PathVariable Long scheduleId, @RequestParam Long userId) {

        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));

        }

        User user = userOpt.get();

        Optional<Schedule> schOpt = scheduleRepository.findByIdAndUser_Id(scheduleId, user.getId());

        if (schOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "Schedule not found"));

        }

        Schedule sch = schOpt.get();

        if (user.getActiveSchedule() != null && user.getActiveSchedule().getId().equals(sch.getId())) {

            user.setActiveSchedule(null);

            userRepository.saveAndFlush(user);

        }

        scheduleRepository.delete(sch);



        user = userRepository.findById(userId).orElseThrow();

        if (user.getActiveSchedule() == null) {

            List<Schedule> remaining = scheduleRepository.findByUserOrderByIdAsc(user);

            if (!remaining.isEmpty()) {

                user.setActiveSchedule(remaining.get(0));

                userRepository.save(user);

            }

        }

        return ResponseEntity.ok(Map.of("message", "Schedule deleted"));

    }


    @PostMapping("/upload")

    @Transactional

    public ResponseEntity<?> uploadSchedule(

            @RequestParam("userId") Long userId,

            @RequestParam(value = "scheduleId", required = false) Long scheduleId,

            @RequestParam("file") MultipartFile file) {

        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));

        }

        User user = userOpt.get();



        Schedule schedule;

        boolean createdNew = false;

        if (scheduleId != null) {

            schedule = scheduleRepository.findByIdAndUser_Id(scheduleId, userId)

                    .orElse(null);

            if (schedule == null) {

                return ResponseEntity.badRequest().body(Map.of("error", "Schedule not found"));

            }

            schedule.getEvents().clear();

            scheduleRepository.save(schedule);

        } else {

            long n = scheduleRepository.countByUser_Id(userId);

            schedule = new Schedule();

            schedule.setUser(user);

            schedule.setScheduleName("Imported schedule");

            schedule = scheduleRepository.save(schedule);

            createdNew = true;

            if (n == 0) {

                user.setActiveSchedule(schedule);

                userRepository.save(user);

            }

        }



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

            return ResponseEntity.ok(Map.of(

                    "message", "Schedule uploaded successfully",

                    "scheduleId", schedule.getId(),

                    "createdNew", createdNew

            ));



        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity.internalServerError().body(Map.of("error", "Error parsing file"));

        }

    }


    @GetMapping("/{targetUserId}")

    @Transactional

    public ResponseEntity<?> getSchedule(

            @PathVariable Long targetUserId,

            @RequestParam(required = false) Long viewerId,

            @RequestParam(required = false) Long scheduleId) {

        Optional<User> targetOpt = userRepository.findById(targetUserId);

        if (targetOpt.isEmpty()) {

            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));

        }

        User target = targetOpt.get();



        Schedule resolved;

        if (viewerId != null && viewerId.equals(targetUserId)) {

            if (scheduleId != null) {

                resolved = scheduleRepository.findByIdAndUser_Id(scheduleId, targetUserId).orElse(null);

                if (resolved == null) {

                    return ResponseEntity.badRequest().body(Map.of("error", "Schedule not found"));

                }

            } else {

                resolved = resolveActiveSchedule(target);

                if (resolved == null) {

                    return ResponseEntity.ok(List.of());

                }

            }

        } else {

            if (viewerId != null && !areAcceptedFriends(viewerId, targetUserId)) {

                return ResponseEntity.status(403).body(Map.of("error", "Not allowed to view this schedule"));

            }

            resolved = resolveActiveSchedule(target);

            if (resolved == null) {

                return ResponseEntity.ok(List.of());

            }

        }



        List<Event> events = eventRepository.findWithTimeslotsByScheduleId(resolved.getId());

        List<EventDto> body = events.stream()
            .map(e -> this.toDto(e, "Owner"))
            .collect(Collectors.toList());

        return ResponseEntity.ok(body);

    }

    private TimeslotDto calculateIntersection(TimeslotDto a, TimeslotDto b) {
    TimeslotDto intersection = new TimeslotDto();
    intersection.setDay(a.getDay());
    
    intersection.setStartTime(a.getStartTime().isAfter(b.getStartTime()) 
        ? a.getStartTime() : b.getStartTime());
    
    intersection.setEndTime(a.getEndTime().isBefore(b.getEndTime()) 
        ? a.getEndTime() : b.getEndTime());
    
    return intersection;
}

    @GetMapping("/compare")
@Transactional(readOnly = true)
public ResponseEntity<?> compareSchedules(
        @RequestParam Long userId,
        @RequestParam Long friendId) {

    if (!areAcceptedFriends(userId, friendId)) {
        return ResponseEntity.status(403).body(Map.of("error", "Not friends"));
    }

    Optional<User> userOpt = userRepository.findById(userId);
    Optional<User> friendOpt = userRepository.findById(friendId);

    if (userOpt.isEmpty() || friendOpt.isEmpty()) {
        return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
    }

    Schedule userSchedule = resolveActiveSchedule(userOpt.get());
    Schedule friendSchedule = resolveActiveSchedule(friendOpt.get());

    List<EventDto> userEvents = userSchedule != null
            ? eventRepository.findWithTimeslotsByScheduleId(userSchedule.getId())
                .stream().map(e -> this.toDto(e, "Me")).collect(Collectors.toList())
            : List.of();

    List<EventDto> friendEvents = friendSchedule != null
            ? eventRepository.findWithTimeslotsByScheduleId(friendSchedule.getId())
                .stream().map(e -> this.toDto(e, friendOpt.get().getName())).collect(Collectors.toList())
            : List.of();

    List<EventDto> combined = new ArrayList<>();
    combined.addAll(userEvents);
    combined.addAll(friendEvents);

    combined.sort((a, b) -> {
        if (a.getTimeslots().isEmpty() || b.getTimeslots().isEmpty()) return 0;
        int dayComp = a.getTimeslots().get(0).getDay().compareToIgnoreCase(b.getTimeslots().get(0).getDay());
        if (dayComp != 0) return dayComp;
        return a.getTimeslots().get(0).getStartTime().compareTo(b.getTimeslots().get(0).getStartTime());
    });

    return ResponseEntity.ok(Map.of(
            "userId", userId,
            "friendId", friendId,
            "combinedSchedule", combined
    ));
}

    @GetMapping("/compare-group")
    @Transactional(readOnly = true)
    public ResponseEntity<?> compareScheduleGroup(
            @RequestParam Long userId,
            @RequestParam Long groupId) {

        Optional<ScheduleGroup> gOpt = scheduleGroupRepository.findByIdAndOwner_Id(groupId, userId);
        if (gOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Group not found"));
        }
        ScheduleGroup group = gOpt.get();
        Optional<User> ownerOpt = userRepository.findById(userId);
        if (ownerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        User owner = ownerOpt.get();

        Schedule userSchedule = resolveActiveSchedule(owner);
        List<EventDto> combined = new ArrayList<>();
        if (userSchedule != null) {
            combined.addAll(
                    eventRepository.findWithTimeslotsByScheduleId(userSchedule.getId()).stream()
                            .map(e -> this.toDto(e, "Me"))
                            .collect(Collectors.toList()));
        }

        List<ScheduleGroupMember> members = scheduleGroupMemberRepository.findByGroup_IdWithUser(groupId);
        members.sort((a, b) -> Long.compare(a.getUser().getId(), b.getUser().getId()));

        for (ScheduleGroupMember row : members) {
            User member = row.getUser();
            if (!areAcceptedFriends(userId, member.getId())) {
                continue;
            }
            Schedule friendSchedule = resolveActiveSchedule(member);
            if (friendSchedule == null) {
                continue;
            }
            String label = member.getName() != null && !member.getName().isBlank()
                    ? member.getName()
                    : member.getUsername();
            combined.addAll(
                    eventRepository.findWithTimeslotsByScheduleId(friendSchedule.getId()).stream()
                            .map(e -> this.toDto(e, label))
                            .collect(Collectors.toList()));
        }

        combined.sort((a, b) -> {
            if (a.getTimeslots().isEmpty() || b.getTimeslots().isEmpty()) {
                return 0;
            }
            int dayComp = a.getTimeslots().get(0).getDay().compareToIgnoreCase(b.getTimeslots().get(0).getDay());
            if (dayComp != 0) {
                return dayComp;
            }
            return a.getTimeslots().get(0).getStartTime().compareTo(b.getTimeslots().get(0).getStartTime());
        });

        return ResponseEntity.ok(Map.of(
                "userId", userId,
                "groupId", groupId,
                "groupName", group.getName(),
                "combinedSchedule", combined
        ));
    }


    private boolean areAcceptedFriends(Long aId, Long bId) {

        if (aId.equals(bId)) {

            return true;

        }

        Optional<User> ua = userRepository.findById(aId);

        Optional<User> ub = userRepository.findById(bId);

        if (ua.isEmpty() || ub.isEmpty()) {

            return false;

        }

        Optional<Friendship> f = friendshipRepository.findBetweenUsers(ua.get(), ub.get());

        return f.filter(friendship -> "ACCEPTED".equals(friendship.getStatus())).isPresent();

    }

    private Schedule resolveActiveSchedule(User user) {

        List<Schedule> all = scheduleRepository.findByUserOrderByIdAsc(user);

        if (all.isEmpty()) {

            return null;

        }

        Schedule marked = user.getActiveSchedule();

        if (marked != null) {

            Optional<Schedule> still = scheduleRepository.findByIdAndUser_Id(marked.getId(), user.getId());

            if (still.isPresent()) {

                return still.get();

            }

            user.setActiveSchedule(null);

            userRepository.save(user);

        }

        Schedule first = all.get(0);

        user.setActiveSchedule(first);

        userRepository.save(user);

        return first;

    }



private EventDto toDto(Event e, String ownerName) {
    EventDto dto = new EventDto();
    dto.setEventId(e.getId());
    dto.setEventName(e.getEventName());
    
    dto.setOwnerName(ownerName);

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



    private String extractTime(String line) {

        int idx = line.indexOf(':');

        if (idx != -1 && line.length() > idx + 1) {

            return line.substring(idx + 1);

        }

        return "";

    }



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

