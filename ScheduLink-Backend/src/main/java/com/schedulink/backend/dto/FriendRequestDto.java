package com.schedulink.backend.dto;

import lombok.Data;

@Data
public class FriendRequestDto {
    private Long friendshipId;
    private Long fromUserId;
    private String fromUsername;
    private String fromName;
}

