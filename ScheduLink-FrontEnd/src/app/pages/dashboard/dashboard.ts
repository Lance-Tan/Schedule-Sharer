import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NavBar } from '../../components/nav-bar.component';
import { ScheduleComponent } from '../../components/schedule.component';
import { FriendService } from '../../services/friend.service';
import { UserService } from '../../services/user.service';
import { ScheduleService, ScheduleSummary } from '../../services/schedule.service';
import { GroupService, ScheduleGroupDto } from '../../services/group.service';

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
  scheduleRows: { eventName: string; day: string; startTime: string; endTime: string; ownerKey?: string; ownerName?: string }[] = [];
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
  sidebarOpen = signal(false);
  friendsSectionOpen = signal(true);
  friendsFilterQuery = '';
  mySchedulesSectionOpen = signal(true);
  incomingSectionOpen = signal(true);
  groupsSectionOpen = signal(true);
  isCompareMode = signal<boolean>(false);
  compareGroupMeta = signal<{ name: string; memberCount: number } | null>(null);
  groups = signal<ScheduleGroupDto[]>([]);
  newGroupName = '';
  creatingGroup = false;
  groupActionMessage = '';
  expandedGroupId = signal<number | null>(null);
  memberPickByGroup = signal<Record<number, number | null>>({});
  renamingGroupId = signal<number | null>(null);
  renameGroupDraft = '';
  showOnboarding = signal<boolean>(false);

  constructor(
    private friendService: FriendService,
    private userService: UserService,
    private scheduleService: ScheduleService,
    private groupService: GroupService,
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
    this.loadGroups();
    this.loadIncomingRequests();
    this.loadSchedules();
    this.startPolling();
    this.maybeOpenOnboarding();
  }

  ngOnDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
  }

  toggleFriendsSection() {
    this.friendsSectionOpen.update((v) => !v);
  }

  toggleMySchedulesSection() {
    this.mySchedulesSectionOpen.update((v) => !v);
  }

  toggleIncomingSection() {
    this.incomingSectionOpen.update((v) => !v);
  }

  toggleGroupsSection() {
    this.groupsSectionOpen.update((v) => !v);
  }

  onDrawerCheckboxChange(checked: boolean) {
    this.sidebarOpen.set(checked);
  }

  maybeOpenOnboarding() {
    const onboardingFlag = localStorage.getItem('showSignupOnboarding');
    if (onboardingFlag === '1') {
      this.showOnboarding.set(true);
      localStorage.removeItem('showSignupOnboarding');
    }
  }

  closeOnboarding() {
    this.showOnboarding.set(false);
  }

  reopenOnboarding() {
    this.showOnboarding.set(true);
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
      next: () => {
        this.selectedScheduleId.set(scheduleId);
        this.loadSchedules();
      },
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
    this.isCompareMode.set(false);
    this.compareGroupMeta.set(null);
    this.scheduleRows = [];
    this.selectedUserId.set(userId);
    this.sidebarOpen.set(false);
    if (userId === this.user?.id) {
      this.loadSchedules();
    }
  }

  loadGroups() {
    if (!this.user?.id) return;
    this.groupActionMessage = '';
    this.groupService.list(this.user.id).subscribe({
      next: (rows) => {
        this.groups.set(Array.isArray(rows) ? rows : []);
      },
      error: () => {
        this.groups.set([]);
      }
    });
  }

  createGroup() {
    if (!this.user?.id) return;
    const name = (this.newGroupName ?? '').trim();
    if (!name) return;
    this.creatingGroup = true;
    this.groupActionMessage = '';
    this.groupService.create(this.user.id, name).subscribe({
      next: () => {
        this.newGroupName = '';
        this.creatingGroup = false;
        this.loadGroups();
      },
      error: () => {
        this.creatingGroup = false;
        this.groupActionMessage = 'Could not create group.';
      }
    });
  }

  toggleExpandGroup(groupId: number) {
    this.expandedGroupId.update((cur) => (cur === groupId ? null : groupId));
    this.renamingGroupId.set(null);
  }

  startRenameGroup(g: ScheduleGroupDto) {
    this.renamingGroupId.set(g.groupId);
    this.renameGroupDraft = g.name;
  }

  cancelRenameGroup() {
    this.renamingGroupId.set(null);
    this.renameGroupDraft = '';
  }

  saveRenameGroup() {
    if (!this.user?.id) return;
    const gid = this.renamingGroupId();
    if (gid == null) return;
    const name = (this.renameGroupDraft ?? '').trim();
    if (!name) return;
    this.groupService.rename(gid, this.user.id, name).subscribe({
      next: () => {
        this.cancelRenameGroup();
        this.loadGroups();
      },
      error: () => {
        this.groupActionMessage = 'Could not rename group.';
      }
    });
  }

  deleteGroup(groupId: number) {
    if (!this.user?.id) return;
    this.groupActionMessage = '';
    this.groupService.delete(groupId, this.user.id).subscribe({
      next: () => {
        this.expandedGroupId.update((cur) => (cur === groupId ? null : cur));
        this.loadGroups();
      },
      error: () => {
        this.groupActionMessage = 'Could not delete group.';
      }
    });
  }

  setMemberPick(groupId: number, userId: number | null) {
    this.memberPickByGroup.update((m) => ({ ...m, [groupId]: userId }));
  }

  addMemberToGroup(groupId: number) {
    if (!this.user?.id) return;
    const pick = this.memberPickByGroup()[groupId];
    if (pick == null) return;
    this.groupActionMessage = '';
    this.groupService.addMember(groupId, this.user.id, pick).subscribe({
      next: () => {
        this.setMemberPick(groupId, null);
        this.loadGroups();
      },
      error: (err: any) => {
        const msg = err?.error?.error;
        this.groupActionMessage =
          typeof msg === 'string' && msg.trim() ? msg : 'Could not add member.';
      }
    });
  }

  removeMemberFromGroup(groupId: number, memberUserId: number) {
    if (!this.user?.id) return;
    this.groupActionMessage = '';
    this.groupService.removeMember(groupId, this.user.id, memberUserId).subscribe({
      next: () => this.loadGroups(),
      error: () => {
        this.groupActionMessage = 'Could not remove member.';
      }
    });
  }

  friendsNotInGroup(g: ScheduleGroupDto) {
    const ids = new Set((g.members ?? []).map((m) => m.id));
    return this.friends().filter((f) => !ids.has(f.id));
  }

  getCompareSubtitle(): string {
    if (!this.isCompareMode()) return '';
    const meta = this.compareGroupMeta();
    if (meta) {
      const n = meta.memberCount;
      const people = n === 1 ? 'person' : 'people';
      return `Me + members of "${meta.name}" (${n} ${people})`;
    }
    const fid = this.selectedUserId();
    if (fid == null || fid === this.user?.id) return '';
    const account = this.friends().find((a) => a.id === fid);
    const label = account?.name || account?.username || 'friend';
    return `Me + ${label}`;
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

  filteredFriends(): Account[] {
    const list = this.friends();
    const q = (this.friendsFilterQuery ?? '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        (a.username ?? '').toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q)
    );
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

  compareWithFriend(friendId: number) {
    this.compareGroupMeta.set(null);
    this.scheduleService.compareSchedules(this.user.id, friendId).subscribe({
      next: (res: any) => {
        this.applyCombinedSchedule(res);
        this.isCompareMode.set(true);
        this.selectedUserId.set(friendId);
        this.sidebarOpen.set(false);
      }
    });
  }

  compareWithGroup(g: ScheduleGroupDto) {
    if (!this.user?.id) return;
    this.scheduleService.compareScheduleGroup(this.user.id, g.groupId).subscribe({
      next: (res: any) => {
        const memberCount = (g.members ?? []).length;
        this.compareGroupMeta.set({ name: g.name, memberCount });
        this.applyCombinedSchedule(res);
        this.isCompareMode.set(true);
        this.selectedUserId.set(this.user.id);
        this.sidebarOpen.set(false);
      },
      error: () => {
        this.groupActionMessage = 'Could not load group comparison.';
      }
    });
  }

  private applyCombinedSchedule(res: any) {
    const combined = res?.combinedSchedule ?? [];
    const allSlots: any[] = [];
    combined.forEach((event: any) => {
      const ownerName = (event.ownerName ?? 'Unknown') as string;
      const ownerKey = ownerName.toLowerCase().trim() || 'unknown';
      const slots = event.timeslots ?? [];
      slots.forEach((slot: any) => {
        allSlots.push({
          name: `${event.eventName}`,
          ownerKey,
          ownerName,
          day: slot.day,
          startMins: this.parseTimeToMinutes(slot.startTime),
          endMins: this.parseTimeToMinutes(slot.endTime)
        });
      });
    });

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'MO', 'TU', 'WE', 'TH', 'FR'];
    allSlots.sort((a, b) => {
      if (a.day !== b.day) return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      return a.startMins - b.startMins;
    });

    this.scheduleRows = allSlots.map((slot) => this.finalizeRow(slot));
  }

private parseTimeToMinutes(time: string): number {
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

  const parts = time.split(':');
  if (parts.length >= 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 0;
}

private formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

private finalizeRow(item: any) {
  return {
    eventName: item.name,
    day: item.day,
    startTime: this.formatMinutes(item.startMins),
    endTime: this.formatMinutes(item.endMins),
    ownerKey: item.ownerKey,
    ownerName: item.ownerName
  };
}
}
