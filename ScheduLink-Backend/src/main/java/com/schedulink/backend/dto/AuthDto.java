package com.schedulink.backend.dto;

import lombok.Data;

public class AuthDto {

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    public static class RegisterRequest {
        private String name;
        private String username;
        private String email;
        private String password;
    }

    @Data
    public static class AuthResponse {
        private Long id;
        private String name;
        private String username;
        private String email;
        private String bio;
        private String timezone;
        private String token;
    }
}
