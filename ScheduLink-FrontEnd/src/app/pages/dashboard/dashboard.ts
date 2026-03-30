import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { NavBar } from '../../components/nav-bar.component';
import { ScheduleService } from '../../services/schedule.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, NavBar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  user: any = null;
  /** Flat rows for the table: one row per timeslot. */
  scheduleRows: { eventName: string; day: string; startTime: string; endTime: string }[] = [];
  uploading = false;
  uploadError = '';
  uploadSuccess = '';

  constructor(private scheduleService: ScheduleService, private router: Router) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (!stored) {
      this.router.navigate(['/login']);
      return;
    }
    this.user = JSON.parse(stored);
    this.loadSchedule();
  }

  loadSchedule() {
    this.scheduleService.getSchedule(this.user.id).subscribe({
      next: (res) => {
        const events = (res ?? []) as { eventName?: string; timeslots?: { day?: string; startTime?: string; endTime?: string }[] }[];
        this.scheduleRows = [];
        for (const ev of events) {
          const slots = ev.timeslots || [];
          if (slots.length === 0) {
            this.scheduleRows.push({
              eventName: ev.eventName ?? '',
              day: '—',
              startTime: '—',
              endTime: '—',
            });
            continue;
          }
          for (const t of slots) {
            this.scheduleRows.push({
              eventName: ev.eventName ?? '',
              day: t.day ?? '',
              startTime: t.startTime ?? '',
              endTime: t.endTime ?? '',
            });
          }
        }
      },
      error: () => {
        console.error('Failed to load schedule');
      }
    });
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  onScheduleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.user) {
      return;
    }

    this.uploadError = '';
    this.uploadSuccess = '';
    this.uploading = true;

    this.scheduleService.uploadSchedule(this.user.id, file).subscribe({
      next: () => {
        this.uploading = false;
        this.uploadSuccess = 'Schedule updated.';
        this.loadSchedule();
        input.value = '';
      },
      error: (err: { error?: { error?: string; message?: string } | string }) => {
        this.uploading = false;
        const body = err?.error;
        if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
          this.uploadError = body.error;
        } else if (typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string') {
          this.uploadError = body.message;
        } else {
          this.uploadError = 'Upload failed. Try again.';
        }
        input.value = '';
      },
    });
  }
}
