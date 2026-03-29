package com.schedulink.backend.repository;

import com.schedulink.backend.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByCourseCodeAndSectionAndDaysAndStartTimeAndEndTime(
            String courseCode, String section, String days, LocalTime startTime, LocalTime endTime);
}
