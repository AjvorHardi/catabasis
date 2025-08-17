import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Database, DatabaseRow, CreateDatabaseRequest, CreateDatabaseRowRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DatabasesService {
  private databasesSubject = new BehaviorSubject<Database[]>([]);
  public databases$ = this.databasesSubject.asObservable();

  private rowsSubject = new BehaviorSubject<DatabaseRow[]>([]);
  public rows$ = this.rowsSubject.asObservable();

  constructor(private supabase: SupabaseService) {}

  async loadDatabases(projectId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('databases')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading databases:', error);
      throw error;
    }

    this.databasesSubject.next(data || []);
  }

  async createDatabase(request: CreateDatabaseRequest): Promise<Database> {
    // Verify user is authenticated
    const { data: { user }, error: userError } = await this.supabase.client.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await this.supabase.client
      .from('databases')
      .insert([request])
      .select()
      .single();

    if (error) {
      console.error('Error creating database:', error);
      throw error;
    }

    await this.loadDatabases(request.project_id);
    return data;
  }

  async updateDatabase(id: string, updates: Partial<Omit<CreateDatabaseRequest, 'project_id'>>): Promise<Database> {
    const { data, error } = await this.supabase.client
      .from('databases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating database:', error);
      throw error;
    }

    const currentDatabases = this.databasesSubject.value;
    const updatedDatabases = currentDatabases.map(db => db.id === id ? data : db);
    this.databasesSubject.next(updatedDatabases);

    return data;
  }

  async deleteDatabase(id: string, projectId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('databases')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting database:', error);
      throw error;
    }

    await this.loadDatabases(projectId);
  }

  async loadDatabaseRows(databaseId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('database_rows')
      .select('*')
      .eq('database_id', databaseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading database rows:', error);
      throw error;
    }

    this.rowsSubject.next(data || []);
  }

  async createDatabaseRow(request: CreateDatabaseRowRequest): Promise<DatabaseRow> {
    // Verify user is authenticated
    const { data: { user }, error: userError } = await this.supabase.client.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await this.supabase.client
      .from('database_rows')
      .insert([request])
      .select()
      .single();

    if (error) {
      console.error('Error creating database row:', error);
      throw error;
    }

    await this.loadDatabaseRows(request.database_id);
    return data;
  }

  async updateDatabaseRow(id: string, data: Record<string, string>): Promise<DatabaseRow> {
    const { data: updatedRow, error } = await this.supabase.client
      .from('database_rows')
      .update({ data })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating database row:', error);
      throw error;
    }

    const currentRows = this.rowsSubject.value;
    const updatedRows = currentRows.map(row => row.id === id ? updatedRow : row);
    this.rowsSubject.next(updatedRows);

    return updatedRow;
  }

  async deleteDatabaseRow(id: string, databaseId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('database_rows')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting database row:', error);
      throw error;
    }

    await this.loadDatabaseRows(databaseId);
  }
}