package com.schedulink.backend.controller;

import com.schedulink.backend.dto.UserSummaryDto;
import com.schedulink.backend.model.User;
import com.schedulink.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/users")
@CrossOrigin("*")
public class UsersController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/search")
    public ResponseEntity<?> searchByUsername(@RequestParam("username") String username) {
        String q = username == null ? "" : username.trim();
        if (q.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<User> users = userRepository.findByUsernameContainingIgnoreCase(q);
        List<UserSummaryDto> body = users.stream().map(this::toSummary).toList();
        return ResponseEntity.ok(body);
    }

    private UserSummaryDto toSummary(User u) {
        UserSummaryDto dto = new UserSummaryDto();
        dto.setId(u.getId());
        dto.setUsername(u.getUsername());
        dto.setName(u.getName());
        return dto;
    }
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable("id") Long id, @RequestBody com.schedulink.backend.dto.UserUpdateDto request) {
        java.util.Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = optionalUser.get();

        //check if username changed and is available
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty() && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername().trim())) {
                return ResponseEntity.badRequest().body("Username already in use");
            }
            user.setUsername(request.getUsername().trim());
        }

        //check if email changed and is available
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty() && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.findByEmail(request.getEmail().trim()).isPresent()) {
                return ResponseEntity.badRequest().body("Email already in use");
            }
            user.setEmail(request.getEmail().trim());
        }

        if (request.getName() != null) user.setName(request.getName());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getTimezone() != null) user.setTimezone(request.getTimezone());

        userRepository.save(user);

        com.schedulink.backend.dto.AuthDto.AuthResponse response = new com.schedulink.backend.dto.AuthDto.AuthResponse();
        response.setId(user.getId());
        response.setName(user.getName());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setBio(user.getBio());
        response.setTimezone(user.getTimezone());
        response.setToken("mock-jwt-token");

        return ResponseEntity.ok(response);
    }
}

