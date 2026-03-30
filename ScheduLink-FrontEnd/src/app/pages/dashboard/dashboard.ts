import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { NavBar } from '../../components/nav-bar.component';

interface Account {
  username: string;
  names: string[];
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet, NavBar, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  currentUser = signal<Account>({
    username: 'current_user',
    names: ['Current User']
  });

  accounts = signal<Account[]>([
    {
      username: 'john_doe',
      names: ['John Doe']
    },
    {
      username: 'jane_smith',
      names: ['Jane Smith']
    },
    {
      username: 'bob_johnson',
      names: ['Bob Johnson']
    },
    {
      username: 'alice_williams',
      names: ['Alice Williams']
    }
  ]);

  selectedUsername = signal<string>('current_user');

  selectAccount(username: string) {
    this.selectedUsername.set(username);
  }

  getSelectedAccountName(): string {
    const selected = this.selectedUsername();
    if (selected === this.currentUser().username) {
      return 'My Schedule';
    }
    const account = this.accounts().find(a => a.username === selected);
    return (account?.names[0] || '') + "'s Schedule";
  }
}
