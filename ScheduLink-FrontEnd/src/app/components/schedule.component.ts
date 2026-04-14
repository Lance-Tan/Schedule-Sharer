import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../services/schedule.service';

interface ScheduleRow {
  eventName: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface GridEvent {
  label: string;
  colIndex: number;
  rowStart: number;
  rowSpan: number;
  colorClass: string;
}

const GRID_START_HOUR = 7;
const GRID_END_HOUR   = 21;
const SLOTS_PER_HOUR  = 2;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const EVENT_COLORS = [
  'ev-purple', 'ev-teal', 'ev-blue', 'ev-coral', 'ev-amber', 'ev-green',
];

const DAY_MAP: Record<string, string> = {
  MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday',
};

function parseTimeToMinutes(time: string): number {
  if (!time || time === '—') return 0;
  const ampm = /(\d+):(\d+)\s*(AM|PM)/i.exec(time.trim());
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  // Handles "17:10:00" or "17:10"
  const parts = time.split(':');
  if (parts.length >= 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  return 0;
}

function minutesToGridRow(minutes: number): number {
  const offset = minutes - GRID_START_HOUR * 60;
  return Math.round((offset / 60) * SLOTS_PER_HOUR);
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

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
            <span class="text-sm font-medium text-base-content/80">Import .ics into this schedule</span>
            <input
              type="file"
              class="file-input file-input-bordered w-full max-w-xs"
              accept=".ics"
              [disabled]="uploading"
              (change)="onScheduleFileSelected($event)"
            />
          </div>
          <p *ngIf="uploading"     class="text-sm text-base-content/70">Uploading…</p>
          <p *ngIf="uploadSuccess" class="text-sm text-success">{{ uploadSuccess }}</p>
          <p *ngIf="uploadError"   class="text-sm text-error">{{ uploadError }}</p>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="scheduleRows.length === 0" class="text-gray-500">
        No events found. {{ isOwnSchedule ? 'Upload a .ics file or pick another schedule in the sidebar.' : 'This friend has no active schedule yet.' }}
      </div>

      <!-- Schedule display -->
      <ng-container *ngIf="scheduleRows.length > 0">

        <!-- GRID VIEW -->
        <div class="sched-scroll">
          <div class="sched-grid" [style.--day-count]="visibleDays.length">

            <div class="corner-cell"></div>

            <div *ngFor="let day of visibleDays" class="day-header" [class.day-today]="isToday(day)">
              {{ day | slice:0:3 }}
            </div>

            <ng-container *ngFor="let slot of timeSlots; let i = index">
              <div class="time-label" [style.grid-row]="i + 2" [style.grid-column]="1">
                <span *ngIf="slot.isHour">{{ slot.label }}</span>
              </div>
              <div
                *ngFor="let day of visibleDays; let di = index"
                class="bg-cell"
                [class.hour-line]="slot.isHour"
                [style.grid-row]="i + 2"
                [style.grid-column]="di + 2">
              </div>
            </ng-container>

            <div
              *ngFor="let ev of gridEvents"
              class="sched-event {{ ev.colorClass }}"
              [style.grid-column]="ev.colIndex + 2"
              [style.grid-row]="(ev.rowStart + 2) + ' / span ' + ev.rowSpan"
              [title]="ev.label">
              <span class="ev-name">{{ ev.label }}</span>
            </div>

          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .schedule-container { width: 100%; }
    .upload-section { margin-bottom: 1rem; }

    .sched-scroll {
      overflow-x: auto;
      overflow-y: auto;
      max-height: 72vh;
      border-radius: 8px;
      border: 1px solid oklch(var(--bc) / 0.12);
    }

    .sched-grid {
      display: grid;
      grid-template-columns: 52px repeat(var(--day-count, 5), minmax(80px, 1fr));
      grid-template-rows: 36px repeat(28, 24px);
      min-width: 400px;
      position: relative;
    }

    .corner-cell {
      grid-column: 1; grid-row: 1;
      position: sticky; top: 0; left: 0; z-index: 3;
      background: oklch(var(--b2));
      border-bottom: 1px solid oklch(var(--bc) / 0.15);
      border-right:  1px solid oklch(var(--bc) / 0.15);
    }

    .day-header {
      grid-row: 1;
      position: sticky; top: 0; z-index: 2;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 600;
      letter-spacing: 0.05em; text-transform: uppercase;
      background: oklch(var(--b2));
      color: oklch(var(--bc) / 0.55);
      border-bottom: 1px solid oklch(var(--bc) / 0.15);
      border-right:  1px solid oklch(var(--bc) / 0.08);
    }
    .day-today {
      color: oklch(var(--p));
      border-bottom-color: oklch(var(--p));
    }

    .time-label {
      grid-column: 1;
      position: sticky; left: 0; z-index: 1;
      display: flex; align-items: flex-start; justify-content: flex-end;
      padding-right: 6px;
      font-size: 10px; line-height: 1;
      color: oklch(var(--bc) / 0.4);
      background: oklch(var(--b1));
      border-right: 1px solid oklch(var(--bc) / 0.12);
      transform: translateY(-6px);
    }

    .bg-cell {
      border-right:  1px solid oklch(var(--bc) / 0.05);
      border-bottom: 1px solid oklch(var(--bc) / 0.05);
    }
    .bg-cell.hour-line { border-bottom-color: oklch(var(--bc) / 0.12); }

    .sched-event {
      margin: 1px 3px;
      border-radius: 5px;
      padding: 2px 6px;
      font-size: 11px; font-weight: 500; line-height: 1.3;
      overflow: hidden;
      display: flex; align-items: flex-start;
      cursor: default;
      transition: filter 0.15s;
      z-index: 1;
    }
    .sched-event:hover { filter: brightness(0.92); }
    .ev-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }

    .ev-purple { background: #CECBF6; color: #3C3489; }
    .ev-teal   { background: #9FE1CB; color: #085041; }
    .ev-blue   { background: #B5D4F4; color: #0C447C; }
    .ev-coral  { background: #F5C4B3; color: #712B13; }
    .ev-amber  { background: #FAC775; color: #633806; }
    .ev-green  { background: #C0DD97; color: #27500A; }
  `]
})
export class ScheduleComponent implements OnInit, OnChanges {
  @Input() userId: number | null = null;
  @Input() viewerUserId: number | null = null;
  @Input() isOwnSchedule: boolean = false;
  @Input() scheduleId: number | null = null;
  @Output() scheduleUpdated = new EventEmitter<void>();

  scheduleRows: ScheduleRow[] = [];
  uploading = false;
  uploadError = '';
  uploadSuccess = '';
  loadError = '';

  visibleDays: string[] = [];
  timeSlots: { label: string; isHour: boolean }[] = [];
  gridEvents: GridEvent[] = [];

  constructor(private scheduleService: ScheduleService) {}

  ngOnInit() {
    if (this.userId) this.loadSchedule();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['userId'] || changes['scheduleId'] || changes['isOwnSchedule'] || changes['viewerUserId']) && this.userId) {
      this.loadSchedule();
    }
  }

  // Unchanged from your original
  loadSchedule() {
    if (!this.userId) return;

    this.loadError = '';
    const viewer = this.viewerUserId ?? undefined;
    const sid = this.isOwnSchedule ? (this.scheduleId ?? undefined) : undefined;

    this.scheduleService.getSchedule(this.userId, {
      viewerId: viewer,
      scheduleId: sid
    }).subscribe({
      next: (res: any) => {
        const events = (res ?? []) as {
          eventName?: string;
          timeslots?: { day?: string; startTime?: string; endTime?: string }[];
        }[];

        this.scheduleRows = [];
        for (const ev of events) {
          const slots = ev.timeslots || [];
          if (slots.length === 0) {
            this.scheduleRows.push({ eventName: ev.eventName ?? '', day: '—', startTime: '—', endTime: '—' });
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

        this.buildGrid();
        console.log('scheduleRows', this.scheduleRows);
        console.log('gridEvents', this.gridEvents);
        console.log('visibleDays', this.visibleDays);
      },
      error: (err) => {
        console.error('Failed to load schedule:', err);
        this.scheduleRows = [];
        const msg = err?.error?.error;
        this.loadError = typeof msg === 'string' ? msg : 'Could not load schedule.';
      }
    });
  }

  onScheduleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.userId) return;

    this.uploadError = '';
    this.uploadSuccess = '';
    this.uploading = true;

    const sid = this.scheduleId;

    this.scheduleService.uploadSchedule(this.userId, file, sid).subscribe({
      next: () => {
        this.uploading = false;
        this.uploadSuccess = 'Schedule updated.';
        this.loadSchedule();
        this.scheduleUpdated.emit();
        input.value = '';
      },
      error: (err: any) => {
        this.uploading = false;
        const body = err?.error;
        const errorMessage =
          (typeof body === 'object' && body?.error) ||
          body?.message ||
          err?.message ||
          'Upload failed. Try again.';
        this.uploadError = typeof errorMessage === 'string' ? errorMessage : 'Upload failed. Try again.';
        console.error('Upload error:', err);
        input.value = '';
      },
    });
  }

  private buildGrid(): void {
    this.scheduleRows = this.scheduleRows.map(row => ({
      ...row,
      day: DAY_MAP[row.day] ?? row.day,
    }));
    const daysWithEvents = new Set(this.scheduleRows.map(r => r.day));
    this.visibleDays = DAYS.filter(d => daysWithEvents.has(d));
    if (this.visibleDays.length === 0) this.visibleDays = [...DAYS];

    const totalSlots = (GRID_END_HOUR - GRID_START_HOUR) * SLOTS_PER_HOUR;
    this.timeSlots = Array.from({ length: totalSlots }, (_, i) => ({
      label: formatMinutes((GRID_START_HOUR + i / SLOTS_PER_HOUR) * 60),
      isHour: i % SLOTS_PER_HOUR === 0,
    }));

    const colorMap = new Map<string, string>();
    let colorIdx = 0;

    this.gridEvents = this.scheduleRows
      .filter(row => row.day !== '—' && row.startTime !== '—')
      .map(row => {
        const colIndex = this.visibleDays.indexOf(row.day);
        if (colIndex === -1) return null;

        const startMins = parseTimeToMinutes(row.startTime);
        const endMins   = parseTimeToMinutes(row.endTime);
        const rowStart  = minutesToGridRow(startMins);
        const rowEnd   = minutesToGridRow(endMins);    // e.g. 10:30 AM → 7
        const rowSpan  = Math.max(1, rowEnd - rowStart); // → 3 slots = 90 min ✓

        if (!colorMap.has(row.eventName)) {
          colorMap.set(row.eventName, EVENT_COLORS[colorIdx++ % EVENT_COLORS.length]);
        }

        return {
          label: row.eventName,
          colIndex,
          rowStart,
          rowSpan,
          colorClass: colorMap.get(row.eventName)!,
        } as GridEvent;
      })
      .filter((ev): ev is GridEvent => ev !== null);
  }

  isToday(day: string): boolean {
    return day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }
}
