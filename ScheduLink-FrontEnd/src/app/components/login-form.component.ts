import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login-form',
  imports: [CommonModule, FormsModule],
  template: `
    <form class="fieldset" (ngSubmit)="onLogin()">
        <label class="label font-semibold text-black">Email</label>
        <input type="email" class="input" placeholder="Email" [(ngModel)]="email" name="email" />

        <label class="label font-semibold text-black">Password</label>
        <input type="password" class="input" placeholder="Password" [(ngModel)]="password" name="password" />

        <p *ngIf="errorMsg" class="text-red-500 text-sm mt-2">{{ errorMsg }}</p>

        <button type="submit" class="btn btn-primary mt-4 rounded-lg">Login</button>
    </form>
  `,
  styles: '',
})
export class LoginForm {
  email = '';
  password = '';
  errorMsg = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        localStorage.setItem('user', JSON.stringify(res));
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.errorMsg = 'Invalid email or password';
      }
    });
  }
}