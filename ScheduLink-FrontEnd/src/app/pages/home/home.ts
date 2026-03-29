import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavBar } from '../../components/nav-bar.component';

@Component({
  selector: 'app-home',
  imports: [RouterOutlet, NavBar],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {}
