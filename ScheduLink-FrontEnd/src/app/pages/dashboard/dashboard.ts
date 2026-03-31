import { Component, signal, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NavBar } from '../../components/nav-bar.component';
import { ScheduleService } from '../../services/schedule.service';
import { FriendService } from '../../services/friend.service';
import { UserService } from '../../services/user.service';

interface Account {
  id: number;
  username: string;
  name: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet, NavBar, CommonModule, FormsModule],
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

  // Sidebar + search state
  friends = signal<Account[]>([]);
  selectedUserId = signal<number | null>(null);
  searchUsername = '';
  searchResults = signal<Account[]>([]);
  searchError = '';
  searchSuccess = '';

  constructor(
    private scheduleService: ScheduleService,
    private friendService: FriendService,
    private userService: UserService,
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
    if (this.selectedUserId() != null) {
      this.loadSchedule(this.selectedUserId()!);
    }
  }

  loadSchedule(userId: number) {
    this.scheduleService.getSchedule(userId).subscribe({
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
      error: () => {
        console.error('Failed to load schedule');
      }
    });
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
        if (this.selectedUserId() != null) {
          this.loadSchedule(this.selectedUserId()!);
        }
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

  selectAccount(userId: number) {
    this.selectedUserId.set(userId);
    this.loadSchedule(userId);
  }

  getSelectedAccountName(): string {
    const selectedId = this.selectedUserId();
    if (selectedId == null) return 'Schedule';
    if (selectedId === this.user?.id) return 'My Schedule';
    const account = this.friends().find((a: Account) => a.id === selectedId);
    const name = account?.name || account?.username || '';
    return name ? `${name}'s Schedule` : "Friend's Schedule";
  }

  curUsr(): Boolean {
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
}
