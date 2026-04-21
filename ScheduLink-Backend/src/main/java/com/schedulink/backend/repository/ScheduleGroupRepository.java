package com.schedulink.backend.repository;

import com.schedulink.backend.model.ScheduleGroup;
import com.schedulink.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduleGroupRepository extends JpaRepository<ScheduleGroup, Long> {

    List<ScheduleGroup> findByOwnerOrderByIdAsc(User owner);

    Optional<ScheduleGroup> findByIdAndOwner_Id(Long id, Long ownerId);
}
