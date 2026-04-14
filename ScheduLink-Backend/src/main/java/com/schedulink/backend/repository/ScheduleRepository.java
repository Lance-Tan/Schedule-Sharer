package com.schedulink.backend.repository;

import com.schedulink.backend.model.Schedule;
import com.schedulink.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    Optional<Schedule> findFirstByUserOrderByIdAsc(User user);

    List<Schedule> findByUserOrderByIdAsc(User user);

    Optional<Schedule> findByIdAndUser_Id(Long scheduleId, Long userId);

    long countByUser_Id(Long userId);
}