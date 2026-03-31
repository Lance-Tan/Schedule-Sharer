package com.schedulink.backend.controller;

import com.schedulink.backend.dto.AuthDto;
import com.schedulink.backend.model.User;
import com.schedulink.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/v1/auth")
@CrossOrigin("*") // Enable CORS for frontend
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthDto.RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already in use");
        }
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required");
        }
        String normalizedUsername = request.getUsername().trim();
        if (userRepository.existsByUsername(normalizedUsername)) {
            return ResponseEntity.badRequest().body("Username already in use");
        }
        User newUser = new User();
        newUser.setName(request.getName());
        newUser.setUsername(normalizedUsername);
        newUser.setEmail(request.getEmail());
        newUser.setPasswordHash(request.getPassword());
        
        userRepository.save(newUser);

        AuthDto.AuthResponse response = new AuthDto.AuthResponse();
        response.setId(newUser.getId());
        response.setName(newUser.getName());
        response.setUsername(newUser.getUsername());
        response.setEmail(newUser.getEmail());
        response.setToken("mock-jwt-token");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthDto.LoginRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty() || !userOpt.get().getPasswordHash().equals(request.getPassword())) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }

        User user = userOpt.get();
        AuthDto.AuthResponse response = new AuthDto.AuthResponse();
        response.setId(user.getId());
        response.setName(user.getName());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setToken("mock-jwt-token");

        return ResponseEntity.ok(response);
    }
}
