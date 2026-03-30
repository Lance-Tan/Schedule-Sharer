package com.schedulink.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalTime;

@Entity
@Table(name = "timeslots")
@Data
public class Timeslot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "timeslot_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(nullable = false)
    private String day;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;
}
