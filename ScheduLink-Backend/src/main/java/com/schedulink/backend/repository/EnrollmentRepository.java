package com.schedulink.backend.repository;

import com.schedulink.backend.model.Enrollment;
import com.schedulink.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    List<Enrollment> findByUser(User user);
    List<Enrollment> findByCourseId(Long courseId);
}
