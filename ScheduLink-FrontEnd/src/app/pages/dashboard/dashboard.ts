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
  courses: any[] = [];

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
      next: (res: any) => {
        this.courses = res;
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
}
