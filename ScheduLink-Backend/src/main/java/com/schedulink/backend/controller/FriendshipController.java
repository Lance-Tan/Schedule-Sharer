package com.schedulink.backend.controller;

import com.schedulink.backend.model.Course;
import com.schedulink.backend.model.Enrollment;
import com.schedulink.backend.model.Friendship;
import com.schedulink.backend.model.User;
import com.schedulink.backend.repository.EnrollmentRepository;
import com.schedulink.backend.repository.FriendshipRepository;
import com.schedulink.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/friends")
@CrossOrigin("*")
public class FriendshipController {

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(@RequestParam Long userId, @RequestParam Long friendId) {
        Optional<User> u1 = userRepository.findById(userId);
        Optional<User> u2 = userRepository.findById(friendId);

        if (u1.isEmpty() || u2.isEmpty()) return ResponseEntity.badRequest().body("User not found");

        Optional<Friendship> existing = friendshipRepository.findByUser1AndUser2(u1.get(), u2.get());
        if (existing.isPresent()) {
            existing.get().setStatus("ACCEPTED");
            friendshipRepository.save(existing.get());
            return ResponseEntity.ok("Friend request accepted");
        }

        Friendship f = new Friendship();
        f.setUser1(u1.get());
        f.setUser2(u2.get());
        f.setStatus("PENDING");
        friendshipRepository.save(f);
        return ResponseEntity.ok("Friend request sent");
    }

    @GetMapping("/compare/{userId}/{friendId}")
    public ResponseEntity<?> compareSchedules(@PathVariable Long userId, @PathVariable Long friendId) {
        Optional<User> u1 = userRepository.findById(userId);
        Optional<User> u2 = userRepository.findById(friendId);

        if (u1.isEmpty() || u2.isEmpty()) return ResponseEntity.badRequest().body("User not found");

        List<Enrollment> enroll1 = enrollmentRepository.findByUser(u1.get());
        List<Enrollment> enroll2 = enrollmentRepository.findByUser(u2.get());

        List<Course> c1 = enroll1.stream().map(Enrollment::getCourse).collect(Collectors.toList());
        List<Course> c2 = enroll2.stream().map(Enrollment::getCourse).collect(Collectors.toList());

        //return full list of matching courses as "Shared Classes"
        List<Course> shared = c1.stream().filter(c -> c2.stream().anyMatch(other -> other.getId().equals(c.getId()))).collect(Collectors.toList());

        return ResponseEntity.ok(shared);
    }
}
