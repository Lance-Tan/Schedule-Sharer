package com.schedulink.backend.controller;

import com.schedulink.backend.dto.FriendRequestDto;
import com.schedulink.backend.dto.UserSummaryDto;
import com.schedulink.backend.model.Friendship;
import com.schedulink.backend.model.User;
import com.schedulink.backend.repository.FriendshipRepository;
import com.schedulink.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
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
        if (userId.equals(friendId)) return ResponseEntity.badRequest().body("Cannot send request to yourself");

        Optional<Friendship> existing = friendshipRepository.findBetweenUsers(u1.get(), u2.get());
        if (existing.isPresent()) {
            Friendship prev = existing.get();
            if ("ACCEPTED".equals(prev.getStatus())) {
                return ResponseEntity.ok("Already connected");
            }
            if ("PENDING".equals(prev.getStatus())) {
                // Reciprocal request immediately accepts the existing request.
                if (prev.getUser().getId().equals(friendId) && prev.getFriend().getId().equals(userId)) {
                    prev.setStatus("ACCEPTED");
                    friendshipRepository.save(prev);
                    return ResponseEntity.ok("Friend request accepted");
                }
                return ResponseEntity.ok("Request already pending");
            }
            prev.setUser(u1.get());
            prev.setFriend(u2.get());
            prev.setStatus("PENDING");
            friendshipRepository.save(prev);
            return ResponseEntity.ok("Friend request sent");
        }

        Friendship f = new Friendship();
        f.setUser(u1.get());
        f.setFriend(u2.get());
        f.setStatus("PENDING");
        friendshipRepository.save(f);
        return ResponseEntity.ok("Friend request sent");
    }

    // List accepted friends for a user (for dashboard sidebar)
    @GetMapping("/list")
    public ResponseEntity<?> listFriends(@RequestParam Long userId) {
        Optional<User> meOpt = userRepository.findById(userId);
        if (meOpt.isEmpty()) return ResponseEntity.badRequest().body("User not found");

        List<Friendship> friendships = friendshipRepository.findAcceptedForUser(userId);
        List<UserSummaryDto> body = new ArrayList<>();

        for (Friendship f : friendships) {
            User other = (f.getUser().getId().equals(userId)) ? f.getFriend() : f.getUser();
            UserSummaryDto dto = new UserSummaryDto();
            dto.setId(other.getId());
            dto.setUsername(other.getUsername());
            dto.setName(other.getName());
            body.add(dto);
        }
        return ResponseEntity.ok(body);
    }

    // List incoming pending requests for a user
    @GetMapping("/requests/incoming")
    public ResponseEntity<?> listIncomingRequests(@RequestParam Long userId) {
        Optional<User> meOpt = userRepository.findById(userId);
        if (meOpt.isEmpty()) return ResponseEntity.badRequest().body("User not found");

        List<Friendship> pending = friendshipRepository.findIncomingPendingForUser(userId);
        List<FriendRequestDto> body = new ArrayList<>();
        for (Friendship f : pending) {
            FriendRequestDto dto = new FriendRequestDto();
            dto.setFriendshipId(f.getId());
            dto.setFromUserId(f.getUser().getId());
            dto.setFromUsername(f.getUser().getUsername());
            dto.setFromName(f.getUser().getName());
            body.add(dto);
        }
        return ResponseEntity.ok(body);
    }

    // Accept an incoming pending request
    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<?> acceptRequest(@PathVariable Long requestId, @RequestParam Long userId) {
        Optional<Friendship> reqOpt = friendshipRepository.findByIdAndFriend_Id(requestId, userId);
        if (reqOpt.isEmpty()) return ResponseEntity.badRequest().body("Request not found");

        Friendship request = reqOpt.get();
        request.setStatus("ACCEPTED");
        friendshipRepository.save(request);
        return ResponseEntity.ok("Request accepted");
    }

    // Deny an incoming pending request
    @PostMapping("/requests/{requestId}/deny")
    public ResponseEntity<?> denyRequest(@PathVariable Long requestId, @RequestParam Long userId) {
        Optional<Friendship> reqOpt = friendshipRepository.findByIdAndFriend_Id(requestId, userId);
        if (reqOpt.isEmpty()) return ResponseEntity.badRequest().body("Request not found");

        friendshipRepository.delete(reqOpt.get());
        return ResponseEntity.ok("Request denied");
    }
}
