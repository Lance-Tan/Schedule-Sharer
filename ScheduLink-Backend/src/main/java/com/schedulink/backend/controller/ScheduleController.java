package com.schedulink.backend.controller;

import com.schedulink.backend.model.Course;
import com.schedulink.backend.model.Enrollment;
import com.schedulink.backend.model.User;
import com.schedulink.backend.repository.CourseRepository;
import com.schedulink.backend.repository.EnrollmentRepository;
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
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/schedules")
@CrossOrigin("*")
public class ScheduleController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadSchedule(@RequestParam("userId") Long userId, @RequestParam("file") MultipartFile file) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        User user = userOpt.get();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean inEvent = false;
            String summary = null;
            String dtStart = null;
            String dtEnd = null;
            String byDay = null; // RRULE parsing simplified

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
                        saveCourseAndEnrollment(user, summary, dtStart, dtEnd, byDay != null ? byDay : "TBD");
                    }
                } else if (inEvent) {
                    if (line.startsWith("SUMMARY:")) summary = line.substring(8);
                    else if (line.startsWith("DTSTART;TZID=") || line.startsWith("DTSTART:")) {
                        dtStart = extractTime(line);
                    } else if (line.startsWith("DTEND;TZID=") || line.startsWith("DTEND:")) {
                        dtEnd = extractTime(line);
                    } else if (line.startsWith("RRULE:")) {
                        // Extract BYDAY from RRULE
                        String[] parts = line.split(";");
                        for (String part : parts) {
                            if (part.startsWith("BYDAY=")) byDay = part.substring(6);
                        }
                    }
                }
            }
            return ResponseEntity.ok("Schedule uploaded successfully");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error parsing file");
        }
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getSchedule(@PathVariable Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }

        List<Enrollment> enrollments = enrollmentRepository.findByUser(userOpt.get());
        List<Course> courses = enrollments.stream().map(Enrollment::getCourse).collect(Collectors.toList());
        return ResponseEntity.ok(courses);
    }

    private void saveCourseAndEnrollment(User user, String summary, String dtStart, String dtEnd, String days) {
        //assumes HHmmss layout like 20230901T080000
        LocalTime startTime = parseTime(dtStart);
        LocalTime endTime = parseTime(dtEnd);
        
        //extract basic course code and section
        String[] parts = summary.split("-");
        String courseCode = parts.length > 0 ? parts[0].trim() : summary;
        String section = parts.length > 1 ? parts[1].trim() : "001";

        Optional<Course> courseOpt = courseRepository.findByCourseCodeAndSectionAndDaysAndStartTimeAndEndTime(courseCode, section, days, startTime, endTime);
        Course course;
        if (courseOpt.isPresent()) {
            course = courseOpt.get();
        } else {
            Course newCourse = new Course();
            newCourse.setCourseCode(courseCode);
            newCourse.setSection(section);
            newCourse.setDays(days);
            newCourse.setStartTime(startTime);
            newCourse.setEndTime(endTime);
            course = courseRepository.save(newCourse);
        }

        final Long courseIdFinal = course.getId();
        // Check if already enrolled
        List<Enrollment> existing = enrollmentRepository.findByUser(user);
        boolean enrolled = existing.stream().anyMatch(e -> e.getCourse().getId().equals(courseIdFinal));
        if (!enrolled) {
            Enrollment enrollment = new Enrollment();
            enrollment.setUser(user);
            enrollment.setCourse(course);
            enrollmentRepository.save(enrollment);
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
                String timePart = dtStr.substring(tIdx + 1, tIdx + 7); // HHmmss
                return LocalTime.parse(timePart, DateTimeFormatter.ofPattern("HHmmss"));
            }
        } catch (Exception e) {}
        return LocalTime.MIDNIGHT;
    }
}
