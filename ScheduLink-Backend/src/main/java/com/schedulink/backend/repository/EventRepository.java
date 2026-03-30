package com.schedulink.backend.repository;

import com.schedulink.backend.model.Event;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    // Find events with timeslots by user ID
    @EntityGraph(attributePaths = "timeslots")
    @Query("SELECT e FROM Event e WHERE e.schedule.user.id = :userId ORDER BY e.id")
    List<Event> findWithTimeslotsByUserId(@Param("userId") Long userId);
}
