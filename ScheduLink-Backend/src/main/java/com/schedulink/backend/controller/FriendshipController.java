package com.schedulink.backend.controller;

import com.schedulink.backend.model.Friendship;
import com.schedulink.backend.model.User;
import com.schedulink.backend.repository.FriendshipRepository;
import com.schedulink.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/v1/friends")
@CrossOrigin("*")
public class FriendshipController {

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Autowired
    private UserRepository userRepository;

    // Send a friend request
    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(@RequestParam Long userId, @RequestParam Long friendId) {
        Optional<User> u1 = userRepository.findById(userId);
        Optional<User> u2 = userRepository.findById(friendId);

        if (u1.isEmpty() || u2.isEmpty()) return ResponseEntity.badRequest().body("User not found");

        Optional<Friendship> existing = friendshipRepository.findBetweenUsers(u1.get(), u2.get());
        if (existing.isPresent()) {
            existing.get().setStatus("ACCEPTED");
            friendshipRepository.save(existing.get());
            return ResponseEntity.ok("Friend request accepted");
        }

        Friendship f = new Friendship();
        f.setUser(u1.get());
        f.setFriend(u2.get());
        f.setStatus("PENDING");
        friendshipRepository.save(f);
        return ResponseEntity.ok("Friend request sent");
    }
}
