import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bg-white rounded-lg p-8 shadow-lg max-w-md w-full">
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          {{ isSignUp ? 'Create Account' : 'Welcome Back' }}
        </h2>
        <p class="text-gray-600">
          {{ isSignUp ? 'Join Catabasis today' : 'Sign in to your account' }}
        </p>
      </div>

      <!-- Toggle between Sign In / Sign Up -->
      <div class="flex mb-6">
        <button
          (click)="setMode(false)"
          [class]="'flex-1 py-2 px-4 text-sm font-medium rounded-l-md border transition-colors ' + 
                   (!isSignUp ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')">
          Sign In
        </button>
        <button
          (click)="setMode(true)"
          [class]="'flex-1 py-2 px-4 text-sm font-medium rounded-r-md border-l-0 border transition-colors ' + 
                   (isSignUp ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')">
          Sign Up
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="authForm" (ngSubmit)="onSubmit()">
        <!-- Email -->
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            formControlName="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="your@email.com">
          <div *ngIf="authForm.get('email')?.invalid && authForm.get('email')?.touched" class="mt-1 text-sm text-red-600">
            Please enter a valid email address
          </div>
        </div>

        <!-- Password -->
        <div class="mb-6">
          <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            formControlName="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="••••••••">
          <div *ngIf="authForm.get('password')?.invalid && authForm.get('password')?.touched" class="mt-1 text-sm text-red-600">
            Password must be at least 6 characters
          </div>
        </div>

        <!-- Error Message -->
        <div *ngIf="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p class="text-sm text-red-600">{{ errorMessage }}</p>
        </div>

        <!-- Success Message -->
        <div *ngIf="successMessage" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p class="text-sm text-green-600">{{ successMessage }}</p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          [disabled]="!authForm.valid || isLoading"
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-md transition-colors duration-200">
          <span *ngIf="!isLoading">{{ isSignUp ? 'Create Account' : 'Sign In' }}</span>
          <span *ngIf="isLoading">{{ isSignUp ? 'Creating Account...' : 'Signing In...' }}</span>
        </button>
      </form>

      <!-- Divider -->
      <div class="my-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>
      </div>

      <!-- Close button -->
      <button
        (click)="onClose()"
        class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors duration-200">
        Back to Home
      </button>
    </div>
  `,
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