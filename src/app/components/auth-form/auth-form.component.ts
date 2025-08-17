import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-form.component.html',
  styles: []
})
export class AuthFormComponent {
  @Output() close = new EventEmitter<void>();
  
  authForm: FormGroup;
  isSignUp = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  setMode(signUp: boolean): void {
    this.isSignUp = signUp;
    this.errorMessage = '';
    this.successMessage = '';
  }

  async onSubmit(): Promise<void> {
    if (!this.authForm.valid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { email, password } = this.authForm.value;

    try {
      if (this.isSignUp) {
        const { user, error } = await this.authService.signUp(email, password);
        if (error) {
          this.errorMessage = error.message;
        } else {
          this.successMessage = 'Account created! Please check your email to verify your account.';
        }
      } else {
        const { user, error } = await this.authService.signInWithEmail(email, password);
        if (error) {
          this.errorMessage = error.message;
        } else {
          // User will be redirected by the auth service
          this.close.emit();
        }
      }
    } catch (error: any) {
      this.errorMessage = error?.message || 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  onClose(): void {
    this.close.emit();
  }
}