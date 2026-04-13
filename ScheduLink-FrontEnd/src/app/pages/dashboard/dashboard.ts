import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NavBar } from '../../components/nav-bar.component';
import { ScheduleComponent } from '../../components/schedule.component';
import { FriendService } from '../../services/friend.service';
import { UserService } from '../../services/user.service';

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

  constructor(
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
    this.loadIncomingRequests();
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
  }

  onScheduleUpdated() {
    console.log('Schedule was updated');
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
