import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    // Listen for auth state changes
    this.supabase.client.auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user || null);
    });

    // Initialize with current session
    this.getCurrentUser();
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    this.currentUserSubject.next(user);
    return user;
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string): Promise<{ user: User | null; error: any }> {
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      console.error('Error signing up:', error);
    }

    return { user: data.user, error };
  }

  async signInWithEmail(email: string, password: string): Promise<{ user: User | null; error: any }> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Error signing in with email:', error);
    } else {
      this.router.navigate(['/dashboard']);
    }

    return { user: data.user, error };
  }

  async resetPassword(email: string): Promise<{ error: any }> {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('Error resetting password:', error);
    }

    return { error };
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    this.router.navigate(['/']);
  }

  get isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }
}