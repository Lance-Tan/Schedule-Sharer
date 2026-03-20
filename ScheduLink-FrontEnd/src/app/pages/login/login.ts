import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavBar } from '../../components/nav-bar.component';
import { LoginForm } from '../../components/login-form.component';
import { SignupForm } from '../../components/signup-form.component';

@Component({
  selector: 'app-login',
  imports: [RouterOutlet, NavBar, LoginForm, SignupForm],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {}
