import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '@supabase/supabase-js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Navigation -->
      <nav class="bg-white shadow-sm border-b">
        <div class="container mx-auto px-4">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <span class="text-xl font-bold text-indigo-600">📊 Catabasis</span>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-gray-700">{{ user?.email }}</span>
              <button 
                (click)="signOut()"
                class="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="container mx-auto px-4 py-8">
        <div class="text-center py-16">
          <h1 class="text-3xl font-bold text-gray-900 mb-4">
            Welcome to your Dashboard
          </h1>
          <p class="text-lg text-gray-600 mb-8">
            Your database management interface will be here soon.
          </p>
          
          <!-- Placeholder for future features -->
          <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div class="bg-white rounded-lg p-8 shadow-md border-2 border-dashed border-gray-200">
              <div class="text-4xl mb-4">🗃️</div>
              <h3 class="text-xl font-semibold mb-2">My Databases</h3>
              <p class="text-gray-500">Create and manage your dynamic tables</p>
              <button class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                Coming Soon
              </button>
            </div>
            
            <div class="bg-white rounded-lg p-8 shadow-md border-2 border-dashed border-gray-200">
              <div class="text-4xl mb-4">⚙️</div>
              <h3 class="text-xl font-semibold mb-2">Variables</h3>
              <p class="text-gray-500">Manage your application variables</p>
              <button class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
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