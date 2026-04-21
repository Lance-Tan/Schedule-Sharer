import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-nav-bar',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="navbar bg-base-100 shadow-sm px-4">
        <div class="navbar-start">
            <a class="text-xl font-semibold">ScheduLink</a>
        </div>

        <div class="navbar-end">
            <button
              *ngIf="signedIn && showHelpButton"
              type="button"
              class="btn btn-ghost btn-circle mr-2"
              title="Show onboarding help"
              aria-label="Show onboarding help"
              (click)="helpClicked.emit()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 1.917-2 3.522-2 1.933 0 3.5 1.343 3.5 3 0 1.163-.79 2.171-1.943 2.665-.873.374-1.557.95-1.557 1.835V15M12 19h.01" />
              </svg>
            </button>

            <!-- Theme Toggle -->
            <label class="swap swap-rotate mr-4 btn btn-ghost btn-circle">
              <input type="checkbox" [checked]="isDarkMode" (change)="toggleTheme()" />
              <!-- sun icon -->
              <svg class="swap-on h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" /></svg>
              <!-- moon icon -->
              <svg class="swap-off h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" /></svg>
            </label>

            <div *ngIf="!signedIn">
                <a routerLink='/login' class="btn btn-soft btn-primary">Log In or Sign Up</a>
            </div>

            <div *ngIf="signedIn" class="flex gap-2">
                <button class="btn btn-outline" (click)="logout()">Sign Out</button>
                
                <!-- Dynamic button based on current route -->
                <a 
                    [routerLink]="profileButtonLink" 
                    class="ml-2 btn btn-primary"
                >
                    {{ profileButtonText }}
                </a>
            </div>
        </div>
    </div>
  `,
  styles: ''
})

export class NavBar implements OnInit, OnDestroy {
    @Input() signedIn: boolean = false;
    @Output() helpClicked = new EventEmitter<void>();
    profileButtonText: string = 'Profile';
    profileButtonLink: string = '/account-settings';
    showHelpButton: boolean = true;
    isDarkMode: boolean = false;
    private routerSubscription!: Subscription;

    constructor(private router: Router) {}
    
    ngOnInit() {
        this.updateProfileButton();
        this.initializeTheme();
        
        // Listen to route changes
        this.routerSubscription = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                this.updateProfileButton();
            });
    }
    
    updateProfileButton() {
        const currentUrl = this.router.url;
        
        if (currentUrl.includes('/account-settings')) {
            this.profileButtonText = 'Dashboard';
            this.profileButtonLink = '/dashboard';
            this.showHelpButton = false;
        } else {
            this.profileButtonText = 'Profile';
            this.profileButtonLink = '/account-settings';
            this.showHelpButton = true;
        }
    }
    
    logout() {
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
    }
    
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.isDarkMode = savedTheme === 'dark';
        } else {
            // Check OS preference
            this.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        this.applyTheme();
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
    }

    private applyTheme() {
        const theme = this.isDarkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
    
    ngOnDestroy() {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
    }
}
