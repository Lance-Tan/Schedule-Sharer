package com.schedulink.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalTime;

@Entity
@Table(name = "courses")
@Data
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String courseCode;
    private String section;
    private String days;
    private LocalTime startTime;
    private LocalTime endTime;
}
