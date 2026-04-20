package com.schedulink.backend.dto;

import lombok.Data;

@Data
public class UserUpdateDto {
    private String name;
    private String username;
    private String email;
    private String bio;
    private String timezone;
}
