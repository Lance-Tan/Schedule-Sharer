package com.schedulink.backend.repository;

import com.schedulink.backend.model.ScheduleGroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduleGroupMemberRepository extends JpaRepository<ScheduleGroupMember, Long> {

    @Query("SELECT m FROM ScheduleGroupMember m JOIN FETCH m.user WHERE m.group.id = :groupId")
    List<ScheduleGroupMember> findByGroup_IdWithUser(@Param("groupId") Long groupId);

    boolean existsByGroup_IdAndUser_Id(Long groupId, Long userId);

    void deleteByGroup_IdAndUser_Id(Long groupId, Long userId);
}
