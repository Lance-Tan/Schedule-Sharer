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
}

