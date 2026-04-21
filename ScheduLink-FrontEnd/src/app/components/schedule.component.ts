import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../services/schedule.service';

interface ScheduleRow {
  eventName: string;
  day: string;
  startTime: string;
  endTime: string;
  ownerKey?: string;
  ownerName?: string;
}

interface CollisionMember {
  label: string;
  ownerLabel?: string;
  startMins: number;
  endMins: number;
  colorClass: string;
}

interface GridEvent {
  id: number;
  label: string;
  ownerLabel?: string;
  day: string;
  startMins: number;
  endMins: number;
  colIndex: number;
  rowStart: number;
  rowSpan: number;
  marginTopPx: number;
  heightPx: number;
  colorClass: string;
  isOverlap: boolean;
  collisionTotal: number;
  collisionMembers: CollisionMember[];
  windowStartMins: number;
  windowEndMins: number;
}

interface CollisionDrawerModel {
  sourceId: number;
  day: string;
  windowStartMins: number;
  windowEndMins: number;
  members: CollisionMember[];
}

const GRID_START_HOUR = 7;
const GRID_END_HOUR   = 21;
/** Slots per hour on the grid (4 = 15-minute rows; avoids false “collisions” from half-hour row overlap). */
const SLOTS_PER_HOUR = 4;
const GRID_BODY_SLOT_ROWS = (GRID_END_HOUR - GRID_START_HOUR) * SLOTS_PER_HOUR;
const SLOT_MINUTES = 60 / SLOTS_PER_HOUR;
/** Must match `.sched-grid` body row track height (`repeat(..., 12px)`). */
const SLOT_HEIGHT_PX = 12;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const EVENT_COLORS = [
  'ev-purple', 'ev-teal', 'ev-blue', 'ev-coral', 'ev-amber', 'ev-green',
];

const DAY_MAP: Record<string, string> = {
  MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday',
};

/** Merge same class + same owner when separated only by a short break (e.g. passing period). */
const SCHEDULE_MERGE_GAP_MAX_MINUTES = 15;
/** Visual-only compaction: close tiny breaks between adjacent blocks without changing event times. */
const VISUAL_GAP_CLOSE_MAX_MINUTES = 15;

/**
 * Normalize a class "code key" so related sections compare equal.
 * Examples:
 * - "CSE 100 - LEC" -> "cse 100"
 * - "MATH-221 Discussion" -> "math 221"
 */
function classCodeKey(eventName: string): string {
  const cleaned = (eventName ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const parts = cleaned.split(' ');
  const dept = parts.find((p) => /[a-z]/.test(p)) ?? '';
  const num = parts.find((p) => /\d/.test(p)) ?? '';
  if (dept && num) return `${dept} ${num}`;
  return cleaned;
}

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

/** First grid body row (slot) that intersects this instant. */
function minutesToGridRowStart(minutes: number): number {
  const offset = minutes - GRID_START_HOUR * 60;
  return Math.max(0, Math.floor((offset / 60) * SLOTS_PER_HOUR));
}

/**
 * Row index just past the last slot that should contain this end time
 * (treats the displayed end time as inclusive through that minute).
 */
function minutesToGridRowEndExclusive(minutes: number): number {
  const offset = minutes - GRID_START_HOUR * 60;
  return Math.ceil((offset / 60) * SLOTS_PER_HOUR);
}

/**
 * Pixel offset from the top of the first spanned row to `startMins`, and height for
 * [startMins, endMins], so events do not paint full slot height when they start/end mid-slot.
 */
function eventVisualMetrics(
  startMins: number,
  endMins: number,
  rowStart: number,
  rowSpan: number
): { marginTopPx: number; heightPx: number } {
  const gridOriginMins = GRID_START_HOUR * 60;
  const firstRowStartMins = gridOriginMins + rowStart * SLOT_MINUTES;
  const marginTopPx =
    (Math.max(0, startMins - firstRowStartMins) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
  const slotSpanPx = rowSpan * SLOT_HEIGHT_PX;
  const maxBodyPx = Math.max(0, slotSpanPx - marginTopPx);
  const durationMin = Math.max(0, endMins - startMins);
  const rawHeight = (durationMin / SLOT_MINUTES) * SLOT_HEIGHT_PX;
  const heightPx = Math.max(14, Math.min(rawHeight, maxBodyPx || rawHeight));
  return { marginTopPx, heightPx };
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
          <div
            class="sched-grid"
            [style.--day-count]="visibleDays.length"
            [style.--slot-rows]="gridBodySlotRows">

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
              [class.sched-event-overlap]="ev.isOverlap"
              [style.grid-column]="ev.colIndex + 2"
              [style.grid-row]="(ev.rowStart + 2) + ' / span ' + ev.rowSpan"
              [style.margin-top.px]="ev.marginTopPx"
              [style.height.px]="ev.heightPx"
              [style.z-index]="ev.isOverlap ? 3 : 1"
              [title]="getEventTooltip(ev)">
              <div class="sched-event-body">
                <div class="ev-title-row">
                  <span class="ev-name">{{ getVisibleLabel(ev) }}</span>
                  <button
                    *ngIf="ev.collisionTotal > 1"
                    type="button"
                    class="collision-chip"
                    [attr.aria-expanded]="isDrawerOpenFor(ev)"
                    aria-haspopup="dialog"
                    (click)="openCollisionDrawer($event, ev)">
                    Collision · {{ ev.collisionTotal }}
                  </button>
                </div>
                <span class="ev-time">{{ getEventTimeRange(ev) }}</span>
              </div>
            </div>

          </div>
        </div>
      </ng-container>

      <!-- Collision detail drawer -->
      <div
        *ngIf="collisionDrawer"
        class="collision-drawer-backdrop"
        role="presentation"
        (click)="closeCollisionDrawer()">
        <aside
          class="collision-drawer-panel"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'collision-drawer-title'"
          (click)="$event.stopPropagation()">
          <div class="collision-drawer-head">
            <div>
              <h2 id="collision-drawer-title" class="collision-drawer-title">Conflicting classes</h2>
              <p class="collision-drawer-sub">
                {{ collisionDrawer.day }} · {{ formatRange(collisionDrawer.windowStartMins, collisionDrawer.windowEndMins) }}
              </p>
            </div>
            <button type="button" class="collision-drawer-close" (click)="closeCollisionDrawer()" aria-label="Close">
              ×
            </button>
          </div>
          <ul class="collision-drawer-list">
            <li *ngFor="let m of collisionDrawer.members" class="collision-drawer-item">
              <span class="collision-drawer-swatch {{ m.colorClass }}"></span>
              <div class="collision-drawer-item-body">
                <div class="collision-drawer-item-name">
                  {{ m.label }}<span *ngIf="isComparingSchedules() && m.ownerLabel" class="collision-drawer-item-owner"> ({{ m.ownerLabel }})</span>
                </div>
                <div class="collision-drawer-item-time">{{ formatRange(m.startMins, m.endMins) }}</div>
              </div>
            </li>
          </ul>
        </aside>
      </div>
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
      /* Fill available width, but keep a minimum readable day width. */
      grid-template-columns: 52px repeat(var(--day-count, 5), minmax(120px, 1fr));
      /* Row height chosen so total body height stays close to the old 28×24px half-hour grid */
      grid-template-rows: 36px repeat(var(--slot-rows, 56), 12px);
      width: 100%;
      min-width: 0;
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
      transform: translateY(-4px);
    }

    .bg-cell {
      border-right:  1px solid oklch(var(--bc) / 0.05);
      border-bottom: 1px solid oklch(var(--bc) / 0.05);
    }
    .bg-cell.hour-line { border-bottom-color: oklch(var(--bc) / 0.12); }

    .sched-event {
      align-self: start;
      margin: 0 2px;
      position: relative;
      justify-self: stretch;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
      border-radius: 5px;
      padding: 2px 4px;
      font-size: 11px; font-weight: 500; line-height: 1.25;
      overflow: visible;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      cursor: default;
      transition: filter 0.15s;
      z-index: 1;
    }

    .sched-event-body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      gap: 1px;
    }

    .ev-title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 4px;
      min-width: 0;
    }

    .ev-name {
      word-break: break-word;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      min-height: 0;
    }

    .ev-time {
      font-size: 8px;
      font-weight: 600;
      line-height: 1.15;
      opacity: 0.88;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
    }

    .collision-chip {
      flex-shrink: 0;
      border: 1px solid oklch(0.72 0.11 75);
      margin: 0;
      padding: 0 6px;
      height: 18px;
      line-height: 16px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
      color: oklch(0.32 0.09 75);
      background: oklch(0.94 0.05 85);
      white-space: nowrap;
    }
    .collision-chip:hover { background: oklch(0.9 0.07 80); }

    .collision-drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 80;
      background: oklch(0% 0 0 / 0.45);
      display: flex;
      justify-content: flex-end;
      align-items: stretch;
      padding: 0;
    }

    /* Fully opaque panel (no transparency on the sheet itself). */
    .collision-drawer-panel {
      width: min(100%, 380px);
      max-height: 100%;
      overflow: auto;
      background: oklch(0.97 0.006 264 / 1);
      border-left: 1px solid oklch(0.78 0.02 264);
      box-shadow: -12px 0 40px oklch(0% 0 0 / 0.22);
      display: flex;
      flex-direction: column;
      opacity: 1;
    }

    :host-context([data-theme='dark']) .collision-drawer-panel {
      background: oklch(0.21 0.024 264 / 1);
      border-left-color: oklch(0.38 0.028 264);
    }

    .collision-drawer-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 16px 12px;
      border-bottom: 1px solid oklch(0.82 0.02 264);
      position: sticky;
      top: 0;
      background: oklch(0.97 0.006 264 / 1);
      z-index: 1;
    }

    :host-context([data-theme='dark']) .collision-drawer-head {
      background: oklch(0.21 0.024 264 / 1);
      border-bottom-color: oklch(0.38 0.028 264);
    }

    .collision-drawer-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: oklch(var(--bc) / 0.95);
    }

    .collision-drawer-sub {
      margin: 4px 0 0;
      font-size: 0.8rem;
      color: oklch(var(--bc) / 0.55);
    }

    .collision-drawer-close {
      border: 0;
      background: transparent;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: oklch(var(--bc) / 0.55);
      padding: 0 4px;
    }
    .collision-drawer-close:hover { color: oklch(var(--bc) / 0.85); }

    .collision-drawer-list {
      list-style: none;
      margin: 0;
      padding: 8px 12px 20px;
      flex: 1;
      background: oklch(0.97 0.006 264 / 1);
    }

    :host-context([data-theme='dark']) .collision-drawer-list {
      background: oklch(0.21 0.024 264 / 1);
    }

    .collision-drawer-item {
      display: flex;
      gap: 10px;
      padding: 10px 8px;
      border-radius: 8px;
      border: 1px solid oklch(0.8 0.014 264);
      margin-bottom: 8px;
      background: oklch(1 0 0 / 1);
    }

    :host-context([data-theme='dark']) .collision-drawer-item {
      background: oklch(0.29 0.026 264 / 1);
      border-color: oklch(0.42 0.03 264);
    }

    .collision-drawer-swatch {
      flex-shrink: 0;
      width: 6px;
      border-radius: 3px;
      align-self: stretch;
      min-height: 36px;
    }

    .collision-drawer-item-body { min-width: 0; flex: 1; }

    .collision-drawer-item-name {
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.3;
      color: oklch(var(--bc) / 0.92);
    }

    .collision-drawer-item-owner {
      font-weight: 500;
      color: oklch(var(--bc) / 0.55);
    }

    .collision-drawer-item-time {
      margin-top: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      color: oklch(var(--bc) / 0.5);
    }

    .sched-event:hover { filter: brightness(0.92); }

    .sched-event-overlap { z-index: 2; }

    .ev-purple { background: rgb(206 203 246 / 0.75); color: #3C3489; }
    .ev-teal   { background: rgb(159 225 203 / 0.75); color: #085041; }
    .ev-blue   { background: rgb(181 212 244 / 0.75); color: #0C447C; }
    .ev-coral  { background: rgb(245 196 179 / 0.75); color: #712B13; }
    .ev-amber  { background: rgb(250 199 117 / 0.75); color: #633806; }
    .ev-green  { background: rgb(192 221 151 / 0.75); color: #27500A; }

    .collision-drawer-swatch.ev-purple { background: rgb(206 203 246); }
    .collision-drawer-swatch.ev-teal   { background: rgb(159 225 203); }
    .collision-drawer-swatch.ev-blue   { background: rgb(181 212 244); }
    .collision-drawer-swatch.ev-coral  { background: rgb(245 196 179); }
    .collision-drawer-swatch.ev-amber  { background: rgb(250 199 117); }
    .collision-drawer-swatch.ev-green  { background: rgb(192 221 151); }

  `]
})
export class ScheduleComponent implements OnInit, OnChanges {
  @Input() userId: number | null = null;
  @Input() viewerUserId: number | null = null;
  @Input() isOwnSchedule: boolean = false;
  @Input() scheduleId: number | null = null;
  @Input() externalRows: ScheduleRow[] | null = null;
  @Output() scheduleUpdated = new EventEmitter<void>();

  scheduleRows: ScheduleRow[] = [];
  uploading = false;
  uploadError = '';
  uploadSuccess = '';
  loadError = '';

  visibleDays: string[] = [];
  timeSlots: { label: string; isHour: boolean }[] = [];
  gridEvents: GridEvent[] = [];
  collisionDrawer: CollisionDrawerModel | null = null;
  readonly gridBodySlotRows = GRID_BODY_SLOT_ROWS;

  constructor(private scheduleService: ScheduleService) {}

  @HostListener('document:keydown.escape')
  onEscapeCloseDrawer(): void {
    if (this.collisionDrawer) {
      this.closeCollisionDrawer();
    }
  }

  ngOnInit() {
    if (this.userId) this.loadSchedule();
  }

ngOnChanges(changes: SimpleChanges) {
  const needsReload = 
    changes['userId'] || 
    changes['scheduleId'] || 
    changes['isOwnSchedule'] || 
    changes['viewerUserId'] || 
    changes['externalRows'];

  if (needsReload && (this.userId || this.externalRows)) {
    this.loadSchedule();
  }
}

  // Unchanged from your original
  loadSchedule() {
    if (this.externalRows != null) {
      this.scheduleRows = [...this.externalRows];
      this.buildGrid();
      return;
    }
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

  /**
   * Same class code + same owner on the same day: if the gap after the first block’s end
   * and before the next block’s start is ≤ {@link SCHEDULE_MERGE_GAP_MAX_MINUTES}, merge
   * into one row (one continuous block on the grid).
   */
  private mergeAdjacentScheduleBreaks(rows: ScheduleRow[]): ScheduleRow[] {
    const rowIsSchedulable = (r: ScheduleRow) =>
      r.day !== '—' && r.startTime !== '—' && r.endTime !== '—';

    const dayOrder = (d: string) => {
      const i = DAYS.indexOf(d);
      return i === -1 ? 999 : i;
    };

    const sorted = [...rows].sort((a, b) => {
      const va = rowIsSchedulable(a);
      const vb = rowIsSchedulable(b);
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      const od = dayOrder(a.day) - dayOrder(b.day);
      if (od !== 0) return od;
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });

    const out: ScheduleRow[] = [];
    for (const row of sorted) {
      if (!rowIsSchedulable(row)) {
        out.push({ ...row });
        continue;
      }
      if (out.length === 0) {
        out.push({ ...row });
        continue;
      }
      const prev = out[out.length - 1];
      if (!rowIsSchedulable(prev)) {
        out.push({ ...row });
        continue;
      }
      const o1 = (prev.ownerName ?? prev.ownerKey ?? '').trim().toLowerCase();
      const o2 = (row.ownerName ?? row.ownerKey ?? '').trim().toLowerCase();
      const c1 = classCodeKey(prev.eventName ?? '');
      const c2 = classCodeKey(row.eventName ?? '');
      if (prev.day === row.day && c1 === c2 && o1 === o2) {
        const gap = parseTimeToMinutes(row.startTime) - parseTimeToMinutes(prev.endTime);
        if (gap >= 0 && gap <= SCHEDULE_MERGE_GAP_MAX_MINUTES) {
          const endMins = Math.max(parseTimeToMinutes(prev.endTime), parseTimeToMinutes(row.endTime));
          prev.endTime = formatMinutes(endMins);
          continue;
        }
      }
      out.push({ ...row });
    }
    return out;
  }

  private buildGrid(): void {
    const mapped = this.scheduleRows.map(row => ({
      ...row,
      day: DAY_MAP[row.day] ?? row.day,
    }));
    this.scheduleRows = this.mergeAdjacentScheduleBreaks(mapped);
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

    let nextEventId = 1;
    type RawEv = {
      id: number;
      label: string;
      ownerLabel?: string;
      ownerKey?: string;
      day: string;
      startMins: number;
      endMins: number;
      colIndex: number;
      colorClass: string;
    };

    const rawEvents = this.scheduleRows
      .filter(row => row.day !== '—' && row.startTime !== '—')
      .map((row): RawEv | null => {
        const colIndex = this.visibleDays.indexOf(row.day);
        if (colIndex === -1) return null;

        const startMins = parseTimeToMinutes(row.startTime);
        const endMins   = parseTimeToMinutes(row.endTime);

        if (!colorMap.has(row.eventName)) {
          colorMap.set(row.eventName, EVENT_COLORS[colorIdx++ % EVENT_COLORS.length]);
        }

        return {
          id: nextEventId++,
          label: row.eventName,
          ownerLabel: row.ownerName,
          ownerKey: row.ownerKey,
          day: row.day,
          startMins,
          endMins,
          colIndex,
          colorClass: colorMap.get(row.eventName)!,
        };
      })
      .filter((ev): ev is RawEv => ev !== null);

    const byDay = new Map<string, RawEv[]>();
    for (const ev of rawEvents) {
      const bucket = byDay.get(ev.day) ?? [];
      bucket.push(ev);
      byDay.set(ev.day, bucket);
    }

    const grid: GridEvent[] = [];

    for (const dayEvents of byDay.values()) {
      dayEvents.sort((a, b) => (a.startMins - b.startMins) || (a.endMins - b.endMins));

      const clusters: RawEv[][] = [];
      let current: RawEv[] = [];
      let currentMaxEnd = -1;

      for (const ev of dayEvents) {
        if (current.length === 0) {
          current = [ev];
          currentMaxEnd = ev.endMins;
          continue;
        }

        if (ev.startMins < currentMaxEnd) {
          current.push(ev);
          currentMaxEnd = Math.max(currentMaxEnd, ev.endMins);
        } else {
          clusters.push(current);
          current = [ev];
          currentMaxEnd = ev.endMins;
        }
      }
      if (current.length > 0) {
        clusters.push(current);
      }

      // Collision state follows real time overlap only (clusters above). Do not merge
      // clusters by half-hour grid rows — e.g. 1:40 PM end and 1:55 PM start share the
      // 1:30–2:00 row but are not a conflict.

      for (const cluster of clusters) {
        if (cluster.length === 1) {
          const ev = cluster[0];
          const rowStart = minutesToGridRowStart(ev.startMins);
          const rowEndEx = minutesToGridRowEndExclusive(ev.endMins);
          const rowSpan = Math.max(1, rowEndEx - rowStart);
          const { marginTopPx, heightPx } = eventVisualMetrics(
            ev.startMins,
            ev.endMins,
            rowStart,
            rowSpan
          );
          const member: CollisionMember = {
            label: ev.label,
            ownerLabel: ev.ownerLabel,
            startMins: ev.startMins,
            endMins: ev.endMins,
            colorClass: ev.colorClass,
          };
          grid.push({
            id: ev.id,
            label: ev.label,
            ownerLabel: ev.ownerLabel,
            day: ev.day,
            startMins: ev.startMins,
            endMins: ev.endMins,
            colIndex: ev.colIndex,
            rowStart,
            rowSpan,
            marginTopPx,
            heightPx,
            colorClass: ev.colorClass,
            isOverlap: false,
            collisionTotal: 1,
            collisionMembers: [member],
            windowStartMins: ev.startMins,
            windowEndMins: ev.endMins,
          });
          continue;
        }

        const clusterStart = Math.min(...cluster.map(c => c.startMins));
        const clusterEnd = Math.max(...cluster.map(c => c.endMins));
        const rowStart = minutesToGridRowStart(clusterStart);
        const rowEndEx = minutesToGridRowEndExclusive(clusterEnd);
        const rowSpan = Math.max(1, rowEndEx - rowStart);
        const { marginTopPx, heightPx } = eventVisualMetrics(
          clusterStart,
          clusterEnd,
          rowStart,
          rowSpan
        );

        const pickPrimary = (items: RawEv[]): RawEv => {
          if (this.isComparingSchedules()) {
            const me = items.find(i => (i.ownerLabel ?? '').trim().toLowerCase() === 'me');
            if (me) return me;
          }

          const sorted = [...items].sort((a, b) => {
            const da = a.endMins - a.startMins;
            const db = b.endMins - b.startMins;
            if (db !== da) return db - da;
            if (a.startMins !== b.startMins) return a.startMins - b.startMins;
            return a.id - b.id;
          });
          return sorted[0];
        };

        const primary = pickPrimary(cluster);
        const collisionMembers: CollisionMember[] = cluster
          .map((c) => ({
            label: c.label,
            ownerLabel: c.ownerLabel,
            startMins: c.startMins,
            endMins: c.endMins,
            colorClass: c.colorClass,
          }))
          .sort((a, b) =>
            a.startMins !== b.startMins ? a.startMins - b.startMins : a.label.localeCompare(b.label)
          );

        grid.push({
          id: primary.id,
          label: primary.label,
          ownerLabel: primary.ownerLabel,
          day: primary.day,
          startMins: primary.startMins,
          endMins: primary.endMins,
          colIndex: primary.colIndex,
          rowStart,
          rowSpan,
          marginTopPx,
          heightPx,
          colorClass: primary.colorClass,
          isOverlap: true,
          collisionTotal: cluster.length,
          collisionMembers,
          windowStartMins: clusterStart,
          windowEndMins: clusterEnd,
        });
      }
    }

    const dayRank = (d: string) => {
      const i = DAYS.indexOf(d);
      return i === -1 ? 99 : i;
    };
    grid.sort((a, b) =>
      a.day === b.day ? a.startMins - b.startMins : dayRank(a.day) - dayRank(b.day)
    );
    this.compactShortVisualGaps(grid);
    this.collisionDrawer = null;
    this.gridEvents = grid;
  }

  /**
   * Rendering-only pass:
   * If two non-overlapping blocks in the same day/column have a short gap (<= 15 min),
   * close the visual gap while preserving true start/end values for labels/tooltips.
   */
  private compactShortVisualGaps(events: GridEvent[]): void {
    const byDayCol = new Map<string, GridEvent[]>();
    for (const ev of events) {
      const key = `${ev.day}__${ev.colIndex}`;
      const bucket = byDayCol.get(key) ?? [];
      bucket.push(ev);
      byDayCol.set(key, bucket);
    }

    for (const bucket of byDayCol.values()) {
      bucket.sort((a, b) => a.startMins - b.startMins || a.endMins - b.endMins);
      let prevVisualEnd = -1;

      for (const ev of bucket) {
        const duration = Math.max(0, ev.endMins - ev.startMins);
        let visualStart = ev.startMins;
        if (prevVisualEnd >= 0) {
          const actualGap = ev.startMins - prevVisualEnd;
          if (actualGap > 0 && actualGap <= VISUAL_GAP_CLOSE_MAX_MINUTES) {
            visualStart = prevVisualEnd;
          }
        }
        const visualEnd = visualStart + duration;
        const rowStart = minutesToGridRowStart(visualStart);
        const rowEndEx = minutesToGridRowEndExclusive(visualEnd);
        const rowSpan = Math.max(1, rowEndEx - rowStart);
        const { marginTopPx, heightPx } = eventVisualMetrics(
          visualStart,
          visualEnd,
          rowStart,
          rowSpan
        );

        ev.rowStart = rowStart;
        ev.rowSpan = rowSpan;
        ev.marginTopPx = marginTopPx;
        ev.heightPx = heightPx;

        prevVisualEnd = visualEnd;
      }
    }
  }

  isToday(day: string): boolean {
    return day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }

  isComparingSchedules(): boolean {
    return this.externalRows != null;
  }

  getVisibleLabel(ev: GridEvent): string {
    if (ev.collisionTotal > 1) {
      const titles = this.overlapClassTitlesCompact(ev.collisionMembers);
      if (this.isComparingSchedules()) {
        return `${titles} (${this.overlapOwnerGroupCompact(ev.collisionMembers)})`;
      }
      return titles;
    }
    if (this.isComparingSchedules() && ev.ownerLabel) {
      return `${ev.label} (${ev.ownerLabel})`;
    }
    return ev.label;
  }

  getEventTimeRange(ev: GridEvent): string {
    return `${formatMinutes(ev.windowStartMins)} – ${formatMinutes(ev.windowEndMins)}`;
  }

  getEventTooltip(ev: GridEvent): string {
    if (ev.collisionTotal > 1) {
      const head = this.isComparingSchedules()
        ? `${this.overlapClassTitles(ev.collisionMembers)} (${this.overlapOwnerGroup(ev.collisionMembers)})`
        : `Classes: ${this.overlapClassTitles(ev.collisionMembers)}`;
      const lines = [
        head,
        `Day: ${ev.day}`,
        `Overlap window: ${formatMinutes(ev.windowStartMins)} – ${formatMinutes(ev.windowEndMins)}`,
        '',
        `Conflicts with ${ev.collisionTotal} classes — click “Collision · ${ev.collisionTotal}” for details.`,
        '',
      ];
      const sorted = [...ev.collisionMembers].sort((a, b) =>
        a.startMins !== b.startMins ? a.startMins - b.startMins : a.label.localeCompare(b.label)
      );
      for (const m of sorted) {
        const who =
          this.isComparingSchedules() && m.ownerLabel ? ` (${m.ownerLabel})` : '';
        lines.push(`• ${m.label}${who}: ${formatMinutes(m.startMins)} - ${formatMinutes(m.endMins)}`);
      }
      return lines.join('\n');
    }

    const lines = [
      `Class: ${ev.label}`,
      `Day: ${ev.day}`,
      `Time: ${formatMinutes(ev.startMins)} - ${formatMinutes(ev.endMins)}`
    ];
    if (this.isComparingSchedules() && ev.ownerLabel) {
      lines.push(`Owner: ${ev.ownerLabel}`);
    }
    return lines.join('\n');
  }

  /** Distinct class names in a collision, for the main label. */
  private overlapClassTitles(members: CollisionMember[]): string {
    return [...new Set(members.map((m) => m.label))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .join(' · ');
  }

  /** Compact class title for block header: Class1 * Class2 + N more */
  private overlapClassTitlesCompact(members: CollisionMember[]): string {
    const items = [...new Set(members.map((m) => m.label))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    if (items.length <= 2) return items.join(' • ');
    return `${items[0]} * ${items[1]} + ${items.length - 2} more`;
  }

  /** Distinct owners, Me first, then alphabetical. */
  private overlapOwnerGroup(members: CollisionMember[]): string {
    const set = new Set<string>();
    for (const m of members) {
      const o = (m.ownerLabel ?? '').trim();
      set.add(o.length > 0 ? o : 'Unknown');
    }
    return [...set]
      .sort((a, b) => {
        const ra = a.toLowerCase() === 'me' ? 0 : 1;
        const rb = b.toLowerCase() === 'me' ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      })
      .join(' + ');
  }

  /** Compact owner title for block header: Me + Name1 + N more */
  private overlapOwnerGroupCompact(members: CollisionMember[]): string {
    const items = this.overlapOwnerGroup(members).split(' + ');
    if (items.length <= 2) return items.join(' + ');
    return `${items[0]} + ${items[1]} + ${items.length - 2} more`;
  }

  formatRange(startMins: number, endMins: number): string {
    return `${formatMinutes(startMins)} – ${formatMinutes(endMins)}`;
  }

  isDrawerOpenFor(ev: GridEvent): boolean {
    return this.collisionDrawer?.sourceId === ev.id;
  }

  openCollisionDrawer(event: MouseEvent, ev: GridEvent): void {
    event.stopPropagation();
    if (this.collisionDrawer?.sourceId === ev.id) {
      this.closeCollisionDrawer();
      return;
    }
    this.collisionDrawer = {
      sourceId: ev.id,
      day: ev.day,
      windowStartMins: ev.windowStartMins,
      windowEndMins: ev.windowEndMins,
      members: [...ev.collisionMembers].sort((a, b) =>
        a.startMins !== b.startMins ? a.startMins - b.startMins : a.label.localeCompare(b.label)
      ),
    };
  }

  closeCollisionDrawer(): void {
    this.collisionDrawer = null;
  }
}