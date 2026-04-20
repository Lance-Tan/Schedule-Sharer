import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ScheduleService } from '../services/schedule.service';

@Component({
  selector: 'app-signup-form',
  imports: [CommonModule, FormsModule],
  template: `
    <form class="fieldset" (ngSubmit)="onSignup()">
        <label class="label font-semibold text-black">Name</label>
        <input type="text" class="input" placeholder="Full Name" [(ngModel)]="name" name="name" />

        <label class="label font-semibold text-black">Username</label>
        <input type="text" class="input" placeholder="Username" [(ngModel)]="username" name="username" />

        <label class="label font-semibold text-black">Email</label>
        <input type="email" class="input" placeholder="Email" [(ngModel)]="email" name="email" />

        <label class="label font-semibold text-black">Password</label>
        <input type="password" class="input" placeholder="Password" [(ngModel)]="password" name="password" />
        
        <legend class="fieldset-legend">Upload Current Class Schedule (.ics file) </legend>
        <input type="file" class="file-input" (change)="onFileSelected($event)" accept=".ics" />

        <p *ngIf="errorMsg" class="text-red-500 text-sm mt-2">{{ errorMsg }}</p>
        <p *ngIf="successMsg" class="text-green-500 text-sm mt-2">{{ successMsg }}</p>

        <button type="submit" class="btn btn-primary mt-4 rounded-lg">Sign Up</button>
    </form>
  `,
  styles: '',
})
export class SignupForm {
  name = '';
  username = '';
  email = '';
  password = '';
  selectedFile: File | null = null;
  errorMsg = '';
  successMsg = '';

  constructor(
    private authService: AuthService,
    private scheduleService: ScheduleService,
    private router: Router
  ) {}

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onSignup() {
    this.errorMsg = '';
    this.successMsg = '';

    this.authService.register({ name: this.name, username: this.username, email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        localStorage.setItem('user', JSON.stringify(res));
        localStorage.setItem('showSignupOnboarding', '1');

        if (this.selectedFile) {
          this.scheduleService.uploadSchedule(res.id, this.selectedFile).subscribe({
            next: () => {
              this.router.navigate(['/dashboard']);
            },
            error: () => {
              this.successMsg = 'Account created! But schedule upload failed.';
            }
          });
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: any) => {
        this.errorMsg = typeof err.error === 'string' ? err.error : 'Registration failed';
      }
    });
  }
}