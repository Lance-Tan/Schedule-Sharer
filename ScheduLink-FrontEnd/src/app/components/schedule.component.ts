import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../services/schedule.service';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="schedule-container">
      <!-- Upload section (only for own schedule) -->
      <div *ngIf="isOwnSchedule" class="upload-section">
        <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4 mb-6">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium text-base-content/80">Replace from .ics</span>
            <input
              type="file"
              class="file-input file-input-bordered w-full max-w-xs"
              accept=".ics"
              [disabled]="uploading"
              (change)="onScheduleFileSelected($event)"
            />
          </div>
          <p *ngIf="uploading" class="text-sm text-base-content/70">Uploading…</p>
          <p *ngIf="uploadSuccess" class="text-sm text-success">{{ uploadSuccess }}</p>
          <p *ngIf="uploadError" class="text-sm text-error">{{ uploadError }}</p>
        </div>
      </div>

      <!-- Schedule Display -->
      <div *ngIf="scheduleRows.length === 0" class="text-gray-500">
        No events found. {{ isOwnSchedule ? 'Upload a .ics file here or at sign-up.' : 'This friend has no schedule yet.' }}
      </div>

      <div class="overflow-x-auto" *ngIf="scheduleRows.length > 0">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>Event</th>
              <th>Day</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of scheduleRows">
              <td>{{ row.eventName }}</td>
              <td>{{ row.day }}</td>
              <td>{{ row.startTime }}</td>
              <td>{{ row.endTime }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .schedule-container {
      width: 100%;
    }
    .upload-section {
      margin-bottom: 1rem;
    }
  `]
})
export class ScheduleComponent implements OnInit, OnChanges {
  @Input() userId: number | null = null;
  @Input() isOwnSchedule: boolean = false;
  @Output() scheduleUpdated = new EventEmitter<void>();

  scheduleRows: { eventName: string; day: string; startTime: string; endTime: string }[] = [];
  uploading = false;
  uploadError = '';
  uploadSuccess = '';

  constructor(private scheduleService: ScheduleService) {}

  ngOnInit() {
    if (this.userId) {
      this.loadSchedule();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && this.userId) {
      this.loadSchedule();
    }
  }

  loadSchedule() {
    if (!this.userId) return;
    
    this.scheduleService.getSchedule(this.userId).subscribe({
      next: (res: any) => {
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
      error: (err) => {
        console.error('Failed to load schedule:', err);
        this.scheduleRows = [];
      }
    });
  }

  onScheduleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.userId) {
      return;
    }

    this.uploadError = '';
    this.uploadSuccess = '';
    this.uploading = true;

    this.scheduleService.uploadSchedule(this.userId, file).subscribe({
      next: () => {
        this.uploading = false;
        this.uploadSuccess = 'Schedule updated.';
        this.loadSchedule();
        this.scheduleUpdated.emit();
        input.value = '';
      },
      error: (err: any) => {
        this.uploading = false;
        const errorMessage = err?.error?.message || err?.message || 'Upload failed. Try again.';
        this.uploadError = errorMessage;
        console.error('Upload error:', err);
        input.value = '';
      },
    });
  }
}