package com.schedulink.backend.repository;

import com.schedulink.backend.model.Schedule;
import com.schedulink.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    // Find the first schedule by user ID
    Optional<Schedule> findFirstByUserOrderByIdAsc(User user);
}