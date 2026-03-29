package com.schedulink.backend.controller;

import com.schedulink.backend.model.Course;
import com.schedulink.backend.model.Enrollment;
import com.schedulink.backend.model.User;
import com.schedulink.backend.repository.CourseRepository;
import com.schedulink.backend.repository.EnrollmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/courses")
@CrossOrigin("*") // Enable CORS for Angular
public class CourseController {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @GetMapping("/{courseId}/classmates")
    public ResponseEntity<?> getClassmates(@PathVariable Long courseId) {
        Optional<Course> courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Course not found");
        }

        List<Enrollment> enrollments = enrollmentRepository.findByCourseId(courseId);
        List<User> classmates = enrollments.stream()
                .map(Enrollment::getUser)
                .collect(Collectors.toList());

        // Do not return password hash
        classmates.forEach(u -> u.setPasswordHash(null));

        return ResponseEntity.ok(classmates);
    }
}
