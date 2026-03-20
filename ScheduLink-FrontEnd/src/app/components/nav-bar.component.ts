import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
    imports: [CommonModule, RouterLink],
  template: `
    <div class="navbar bg-base-100 shadow-sm px-4">
        <div class="navbar-start">
            <a class="text-xl font-semibold">ScheduLink</a>
        </div>

        <div class="navbar-end">
            <div *ngIf="!signedIn">
                <a routerLink='/login' class="btn btn-soft btn-primary">Log In or Sign Up</a>
            </div>

            <div *ngIf="signedIn">
                <a routerLink='/account-settings' class="btn btn-soft btn-primary">Account Settings</a>
            </div>
        </div>
    </div>
  `,
  styles: '',
})

export class NavBar {
    @Input() signedIn: boolean = false;
}