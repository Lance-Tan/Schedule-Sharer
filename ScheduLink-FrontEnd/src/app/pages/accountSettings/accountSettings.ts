import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavBar } from '../../components/nav-bar.component';
import { FriendService } from '../../services/friend.service';

@Component({
  selector: 'app-accountSettings',
  imports: [NavBar],
  templateUrl: './accountSettings.html',
  styleUrl: './accountSettings.css'
})
export class AccountSettingsComponent implements OnInit {
  activeTab = 'Profile';
  user: any = null;
  pendingRequests: any[] = [];
  requestActionMessage = '';

  constructor(private router: Router, private friendService: FriendService) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (!stored) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      this.user = JSON.parse(stored);
      this.loadPendingRequests();
    } catch {
      this.router.navigate(['/login']);
    }
  }

  // Grab the first letter of the user's name for the avatar
  get userInitial(): string {
    if (!this.user?.name) return 'U';
    return this.user.name.charAt(0).toUpperCase();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  loadPendingRequests() {
    if (!this.user?.id) return;

    this.friendService.getIncomingRequests(this.user.id).subscribe({
      next: (data: any) => this.pendingRequests = data,
      error: (err) => console.error('Could not load pending requests:', err)
    });
  }

  acceptRequest(requestId: number) {
    if (!this.user?.id) return;

    this.friendService.acceptRequest(requestId, this.user.id).subscribe({
      next: () => {
        this.requestActionMessage = 'Request accepted!';
        this.loadPendingRequests();
        setTimeout(() => this.requestActionMessage = '', 3000);
      },
      error: () => this.requestActionMessage = 'Something went wrong.'
    });
  }

  denyRequest(requestId: number) {
    if (!this.user?.id) return;

    this.friendService.denyRequest(requestId, this.user.id).subscribe({
      next: () => {
        this.requestActionMessage = 'Request denied.';
        this.loadPendingRequests();
        setTimeout(() => this.requestActionMessage = '', 3000);
      },
      error: () => this.requestActionMessage = 'Something went wrong.'
    });
  }
}
