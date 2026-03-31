import { Component, Input, OnInit, OnDestroy } from '@angular/core';
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
    profileButtonText: string = 'Profile';
    profileButtonLink: string = '/account-settings';
    private routerSubscription!: Subscription;

    constructor(private router: Router) {}
    
    ngOnInit() {
        this.updateProfileButton();
        
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
        } else {
            this.profileButtonText = 'Profile';
            this.profileButtonLink = '/account-settings';
        }
    }
    
    logout() {
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
    }
    
    ngOnDestroy() {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
    }
}
