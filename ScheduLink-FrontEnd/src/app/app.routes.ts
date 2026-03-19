import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { HomeComponent } from './pages/home/home';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AccountSettingsComponent } from './pages/accountSettings/accountSettings';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'home', component: HomeComponent },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'account-settings', component: AccountSettingsComponent },
    { path: '', redirectTo: 'home', pathMatch: 'full' },
];
