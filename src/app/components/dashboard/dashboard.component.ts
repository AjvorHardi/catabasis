import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ProjectsListComponent } from '../projects-list/projects-list.component';
import { User } from '@supabase/supabase-js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ProjectsListComponent],
  templateUrl: './dashboard.component.html',
  styles: []
})
export class DashboardComponent implements OnInit {
  user: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }
}