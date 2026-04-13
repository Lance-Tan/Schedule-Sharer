import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NavBar } from '../../components/nav-bar.component';
import { ScheduleComponent } from '../../components/schedule.component';
import { FriendService } from '../../services/friend.service';
import { UserService } from '../../services/user.service';
import { ScheduleService, ScheduleSummary } from '../../services/schedule.service';

interface Account {
  id: number;
  username: string;
  name: string;
}

interface IncomingRequest {
  friendshipId: number;
  fromUserId: number;
  fromUsername: string;
  fromName: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterOutlet, 
    NavBar, 
    CommonModule, 
    FormsModule,
    ScheduleComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  user: any = null;
  /** Flat rows for the table: one row per timeslot. */
  scheduleRows: { eventName: string; day: string; startTime: string; endTime: string }[] = [];
  uploading = false;
  uploadError = '';
  uploadSuccess = '';

  // Sidebar + search state
  friends = signal<Account[]>([]);
  selectedUserId = signal<number | null>(null);
  searchUsername = '';
  searchResults = signal<Account[]>([]);
  searchError = '';
  searchSuccess = '';
  incomingRequests = signal<IncomingRequest[]>([]);
  requestActionMessage = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  schedules = signal<ScheduleSummary[]>([]);
  selectedScheduleId = signal<number | null>(null);
  newScheduleName = '';
  creatingSchedule = false;
  scheduleListError = '';
  renamingScheduleId = signal<number | null>(null);
  renameDraft = '';

  constructor(
    private friendService: FriendService,
    private userService: UserService,
    private scheduleService: ScheduleService,
    private router: Router
  ) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (!stored) {
      this.router.navigate(['/login']);
      return;
    }
    this.user = JSON.parse(stored);
    this.selectedUserId.set(this.user?.id ?? null);
    this.loadFriends();
    this.loadIncomingRequests();
    this.loadSchedules();
    this.startPolling();
  }

  ngOnDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      if (!this.user?.id) return;
      this.loadFriends();
      this.loadIncomingRequests();
    }, 5000);
  }

  loadFriends() {
    if (!this.user?.id) return;
    this.friendService.listFriends(this.user.id).subscribe({
      next: (res: any) => {
        const rows = (res ?? []) as any[];
        this.friends.set(
          rows
            .filter(r => r && typeof r.id === 'number')
            .map(r => ({ id: r.id, username: r.username ?? '', name: r.name ?? '' }))
        );
      },
      error: () => {
        this.friends.set([]);
      }
    });
  }

  loadSchedules() {
    if (!this.user?.id) return;
    this.scheduleListError = '';
    this.scheduleService.listSchedules(this.user.id).subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.schedules.set(list);
        const ids = new Set(list.map((s) => s.scheduleId));
        const cur = this.selectedScheduleId();
        if (cur === null || !ids.has(cur)) {
          const active = list.find((s) => s.active);
          this.selectedScheduleId.set(active?.scheduleId ?? list[0]?.scheduleId ?? null);
        }
      },
      error: () => {
        this.schedules.set([]);
        this.scheduleListError = 'Could not load schedules.';
      }
    });
  }

  selectSchedule(scheduleId: number) {
    this.selectedScheduleId.set(scheduleId);
  }

  startRename(s: ScheduleSummary) {
    this.renamingScheduleId.set(s.scheduleId);
    this.renameDraft = s.name;
    this.scheduleListError = '';
  }

  cancelRename() {
    this.renamingScheduleId.set(null);
    this.renameDraft = '';
    this.scheduleListError = '';
  }

  saveRename() {
    const sid = this.renamingScheduleId();
    if (sid == null || !this.user?.id) return;
    const name = (this.renameDraft ?? '').trim();
    if (!name) {
      this.scheduleListError = 'Enter a name.';
      return;
    }
    this.scheduleListError = '';
    this.scheduleService.renameSchedule(sid, this.user.id, name).subscribe({
      next: () => {
        this.cancelRename();
        this.loadSchedules();
      },
      error: () => {
        this.scheduleListError = 'Could not rename schedule.';
      }
    });
  }

  setActiveScheduleId(scheduleId: number) {
    if (!this.user?.id) return;
    this.scheduleListError = '';
    this.scheduleService.setActiveSchedule(this.user.id, scheduleId).subscribe({
      next: () => this.loadSchedules(),
      error: () => {
        this.scheduleListError = 'Could not update active schedule.';
      }
    });
  }

  deleteScheduleById(scheduleId: number) {
    if (!this.user?.id) return;
    if (!confirm('Delete this schedule and all its events?')) return;
    this.scheduleListError = '';
    this.scheduleService.deleteSchedule(scheduleId, this.user.id).subscribe({
      next: () => {
        this.loadSchedules();
      },
      error: () => {
        this.scheduleListError = 'Could not delete schedule.';
      }
    });
  }

  createEmptySchedule() {
    if (!this.user?.id) return;
    const raw = (this.newScheduleName ?? '').trim();
    const name = raw || 'New schedule';
    this.creatingSchedule = true;
    this.scheduleListError = '';
    this.scheduleService.createSchedule(this.user.id, name).subscribe({
      next: (res) => {
        this.creatingSchedule = false;
        this.newScheduleName = '';
        this.selectedScheduleId.set(res.scheduleId);
        this.loadSchedules();
      },
      error: () => {
        this.creatingSchedule = false;
        this.scheduleListError = 'Could not create schedule.';
      }
    });
  }

  loadIncomingRequests() {
    if (!this.user?.id) return;
    this.friendService.getIncomingRequests(this.user.id).subscribe({
      next: (res: any) => {
        const rows = (res ?? []) as any[];
        this.incomingRequests.set(
          rows
            .filter(r => r && typeof r.friendshipId === 'number' && typeof r.fromUserId === 'number')
            .map(r => ({
              friendshipId: r.friendshipId,
              fromUserId: r.fromUserId,
              fromUsername: r.fromUsername ?? '',
              fromName: r.fromName ?? ''
            }))
        );
      },
      error: () => {
        this.incomingRequests.set([]);
      }
    });
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  selectAccount(userId: number) {
    this.selectedUserId.set(userId);
    if (userId === this.user?.id) {
      this.loadSchedules();
    }
  }

  onScheduleUpdated() {
    this.loadSchedules();
  }

  getSelectedAccountName(): string {
    const selectedId = this.selectedUserId();
    if (selectedId == null) return 'Schedule';
    if (selectedId === this.user?.id) return 'My Schedule';
    const account = this.friends().find((a: Account) => a.id === selectedId);
    const name = account?.name || account?.username || '';
    return name ? `${name}'s Schedule` : "Friend's Schedule";
  }

  curUsr(): boolean {
    const selectedId = this.selectedUserId();
    return selectedId != null && selectedId === this.user?.id;
  }

  onSearchUsers() {
    this.searchError = '';
    this.searchSuccess = '';
    const q = (this.searchUsername ?? '').trim();
    if (!q) {
      this.searchResults.set([]);
      return;
    }
    this.userService.searchByUsername(q).subscribe({
      next: (res: any) => {
        const rows = (res ?? []) as any[];
        const meId = this.user?.id;
        this.searchResults.set(
          rows
            .filter(r => r && typeof r.id === 'number' && r.id !== meId)
            .map(r => ({ id: r.id, username: r.username ?? '', name: r.name ?? '' }))
        );
      },
      error: () => {
        this.searchError = 'Search failed. Try again.';
        this.searchResults.set([]);
      }
    });
  }

  sendFriendRequest(friendId: number) {
    if (!this.user?.id) return;
    this.searchError = '';
    this.searchSuccess = '';
    this.friendService.requestFriend(this.user.id, friendId).subscribe({
      next: (res: any) => {
        const msg = typeof res === 'string' && res.trim() ? res : 'Request sent.';
        this.searchSuccess = msg;
        this.loadFriends();
        this.loadIncomingRequests();
      },
      error: (err: any) => {
        const body = err?.error;
        this.searchSuccess = '';
        if (typeof body === 'string' && body.trim()) {
          this.searchError = body;
        } else if (body && typeof body === 'object' && typeof body.message === 'string') {
          this.searchError = body.message;
        } else {
          this.searchError = 'Could not send request.';
        }
      }
    });
  }

  acceptRequest(requestId: number) {
    if (!this.user?.id) return;
    this.requestActionMessage = '';
    this.friendService.acceptRequest(requestId, this.user.id).subscribe({
      next: () => {
        this.requestActionMessage = 'Request accepted.';
        this.loadIncomingRequests();
        this.loadFriends();
      },
      error: () => {
        this.requestActionMessage = 'Could not accept request.';
      }
    });
  }

  denyRequest(requestId: number) {
    if (!this.user?.id) return;
    this.requestActionMessage = '';
    this.friendService.denyRequest(requestId, this.user.id).subscribe({
      next: () => {
        this.requestActionMessage = 'Request denied.';
        this.loadIncomingRequests();
      },
      error: () => {
        this.requestActionMessage = 'Could not deny request.';
      }
    });
  }
}
