package com.schedulink.backend.controller;

import com.schedulink.backend.model.Friendship;
import com.schedulink.backend.model.ScheduleGroup;
import com.schedulink.backend.model.ScheduleGroupMember;
import com.schedulink.backend.model.User;
import com.schedulink.backend.repository.FriendshipRepository;
import com.schedulink.backend.repository.ScheduleGroupMemberRepository;
import com.schedulink.backend.repository.ScheduleGroupRepository;
import com.schedulink.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/v1/groups")
@CrossOrigin("*")
public class GroupController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ScheduleGroupRepository scheduleGroupRepository;

    @Autowired
    private ScheduleGroupMemberRepository scheduleGroupMemberRepository;

    @Autowired
    private FriendshipRepository friendshipRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> list(@RequestParam Long userId) {
        Optional<User> ownerOpt = userRepository.findById(userId);
        if (ownerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        List<ScheduleGroup> groups = scheduleGroupRepository.findByOwnerOrderByIdAsc(ownerOpt.get());
        List<Map<String, Object>> out = new ArrayList<>();
        for (ScheduleGroup g : groups) {
            out.add(toGroupMap(g));
        }
        return ResponseEntity.ok(out);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        Long userId = parseLong(body.get("userId"));
        String name = body.get("name") != null ? String.valueOf(body.get("name")).trim() : "";
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId required"));
        }
        if (name.isEmpty() || name.length() > 200) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid name"));
        }
        Optional<User> ownerOpt = userRepository.findById(userId);
        if (ownerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        ScheduleGroup g = new ScheduleGroup();
        g.setOwner(ownerOpt.get());
        g.setName(name);
        scheduleGroupRepository.save(g);
        return ResponseEntity.ok(Map.of(
                "groupId", g.getId(),
                "name", g.getName(),
                "message", "created"
        ));
    }

    @PatchMapping("/{groupId}")
    @Transactional
    public ResponseEntity<?> rename(
            @PathVariable Long groupId,
            @RequestBody Map<String, Object> body) {
        Long userId = parseLong(body.get("userId"));
        String name = body.get("name") != null ? String.valueOf(body.get("name")).trim() : "";
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId required"));
        }
        if (name.isEmpty() || name.length() > 200) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid name"));
        }
        Optional<ScheduleGroup> gOpt = scheduleGroupRepository.findByIdAndOwner_Id(groupId, userId);
        if (gOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Group not found"));
        }
        ScheduleGroup g = gOpt.get();
        g.setName(name);
        scheduleGroupRepository.save(g);
        return ResponseEntity.ok(Map.of("message", "updated", "name", g.getName()));
    }

    @DeleteMapping("/{groupId}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long groupId, @RequestParam Long userId) {
        Optional<ScheduleGroup> gOpt = scheduleGroupRepository.findByIdAndOwner_Id(groupId, userId);
        if (gOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Group not found"));
        }
        scheduleGroupRepository.delete(gOpt.get());
        return ResponseEntity.ok(Map.of("message", "deleted"));
    }

    @PostMapping("/{groupId}/members")
    @Transactional
    public ResponseEntity<?> addMember(
            @PathVariable Long groupId,
            @RequestBody Map<String, Object> body) {
        Long ownerUserId = parseLong(body.get("ownerUserId"));
        Long memberUserId = parseLong(body.get("memberUserId"));
        if (ownerUserId == null || memberUserId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "ownerUserId and memberUserId required"));
        }
        if (ownerUserId.equals(memberUserId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot add yourself to a group"));
        }
        Optional<ScheduleGroup> gOpt = scheduleGroupRepository.findByIdAndOwner_Id(groupId, ownerUserId);
        if (gOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Group not found"));
        }
        if (!areAcceptedFriends(ownerUserId, memberUserId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Can only add accepted friends"));
        }
        if (scheduleGroupMemberRepository.existsByGroup_IdAndUser_Id(groupId, memberUserId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Already in group"));
        }
        Optional<User> memberOpt = userRepository.findById(memberUserId);
        if (memberOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        ScheduleGroupMember row = new ScheduleGroupMember();
        row.setGroup(gOpt.get());
        row.setUser(memberOpt.get());
        scheduleGroupMemberRepository.save(row);
        return ResponseEntity.ok(Map.of("message", "member added"));
    }

    @DeleteMapping("/{groupId}/members/{memberUserId}")
    @Transactional
    public ResponseEntity<?> removeMember(
            @PathVariable Long groupId,
            @PathVariable Long memberUserId,
            @RequestParam Long ownerUserId) {
        Optional<ScheduleGroup> gOpt = scheduleGroupRepository.findByIdAndOwner_Id(groupId, ownerUserId);
        if (gOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Group not found"));
        }
        if (!scheduleGroupMemberRepository.existsByGroup_IdAndUser_Id(groupId, memberUserId)) {
            return ResponseEntity.status(404).body(Map.of("error", "Member not in group"));
        }
        scheduleGroupMemberRepository.deleteByGroup_IdAndUser_Id(groupId, memberUserId);
        return ResponseEntity.ok(Map.of("message", "member removed"));
    }

    private Map<String, Object> toGroupMap(ScheduleGroup g) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("groupId", g.getId());
        row.put("name", g.getName());
        List<ScheduleGroupMember> members = scheduleGroupMemberRepository.findByGroup_IdWithUser(g.getId());
        List<Map<String, Object>> memberMaps = new ArrayList<>();
        for (ScheduleGroupMember m : members) {
            User u = m.getUser();
            Map<String, Object> mu = new LinkedHashMap<>();
            mu.put("id", u.getId());
            mu.put("username", u.getUsername());
            mu.put("name", u.getName());
            memberMaps.add(mu);
        }
        row.put("members", memberMaps);
        return row;
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

    private static Long parseLong(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
