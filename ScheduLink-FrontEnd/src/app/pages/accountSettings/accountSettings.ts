import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavBar } from '../../components/nav-bar.component';

@Component({
  selector: 'app-accountSettings',
  imports: [RouterOutlet, NavBar],
  templateUrl: './accountSettings.html',
  styleUrl: './accountSettings.css'
})
export class AccountSettingsComponent {}
