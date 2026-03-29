import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup-form',
    imports: [CommonModule, RouterLink],
    template: `
    <form class="fieldset">
        <label class="label font-semibold text-black">Username</label>
        <input type="text" class="input" placeholder="Username" />

        <label class="label font-semibold text-black">Password</label>
        <input type="password" class="input" placeholder="Password" />
        
        <legend class="fieldset-legend">Upload Current Class Schedule (.ics file) </legend>
        <input type="file" class="file-input" />

        <button class="btn btn-primary mt-4 rounded-lg">Sign Up</button>
    </form>
  `,
  styles: '',
})

export class SignupForm {
}