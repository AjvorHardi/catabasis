import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AuthFormComponent } from '../auth-form/auth-form.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AuthFormComponent],
  templateUrl: './home.component.html',
  styles: []
})
export class HomeComponent {
  showAuthForm = false;

  constructor(private authService: AuthService) {}

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
    } catch (error) {
      console.error('Failed to sign in:', error);
    }
  }

  showEmailAuth(): void {
    this.showAuthForm = true;
  }

  hideEmailAuth(): void {
    this.showAuthForm = false;
  }
}