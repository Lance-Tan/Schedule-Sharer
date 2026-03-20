import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-form',
    imports: [CommonModule, RouterLink],
  template: `
    <form class="fieldset">
        <label class="label font-semibold text-black">Username</label>
        <input type="email" class="input" placeholder="Username" />

        <label class="label font-semibold text-black">Password</label>
        <input type="password" class="input" placeholder="Password" />
        
        <button class="btn btn-primary mt-4 rounded-lg">Login</button>
    </form>
  `,
  styles: '',
})

export class LoginForm {
}