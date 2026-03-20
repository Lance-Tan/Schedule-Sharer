import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavBar } from '../../components/nav-bar.component';

@Component({
  selector: 'app-login',
  imports: [RouterOutlet, NavBar],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {}
