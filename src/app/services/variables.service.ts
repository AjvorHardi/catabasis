import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { BuildHooksService } from './build-hooks.service';
import { Variable, CreateVariableRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class VariablesService {
  private variablesSubject = new BehaviorSubject<Variable[]>([]);
  public variables$ = this.variablesSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private buildHooks: BuildHooksService
  ) {}

  async loadVariables(projectId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('variables')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading variables:', error);
      throw error;
    }

    this.variablesSubject.next(data || []);
  }

  async createVariable(request: CreateVariableRequest): Promise<Variable> {
    // Verify user is authenticated
    const { data: { user }, error: userError } = await this.supabase.client.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await this.supabase.client
      .from('variables')
      .insert([request])
      .select()
      .single();

    if (error) {
      console.error('Error creating variable:', error);
      throw error;
    }

    await this.loadVariables(request.project_id);
    
    // Trigger build hook for variable creation
    this.buildHooks.triggerBuildHook(
      request.project_id,
      'variable_update',
      { action: 'create', variable: { name: data.name, value: data.value } }
    ).subscribe({
      next: (deploymentId) => {
        if (deploymentId) {
          console.log('Build hook triggered for variable creation:', deploymentId);
        }
      },
      error: (error) => console.warn('Build hook failed:', error)
    });
    
    return data;
  }

  async updateVariable(id: string, updates: Partial<Omit<CreateVariableRequest, 'project_id'>>): Promise<Variable> {
    const { data, error } = await this.supabase.client
      .from('variables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating variable:', error);
      throw error;
    }

    const currentVariables = this.variablesSubject.value;
    const updatedVariables = currentVariables.map(v => v.id === id ? data : v);
    this.variablesSubject.next(updatedVariables);
    
    // Trigger build hook for variable update
    this.buildHooks.triggerBuildHook(
      data.project_id,
      'variable_update',
      { action: 'update', variable: { name: data.name, value: data.value } }
    ).subscribe({
      next: (deploymentId) => {
        if (deploymentId) {
          console.log('Build hook triggered for variable update:', deploymentId);
        }
      },
      error: (error) => console.warn('Build hook failed:', error)
    });

    return data;
  }

  async deleteVariable(id: string, projectId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('variables')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting variable:', error);
      throw error;
    }

    await this.loadVariables(projectId);
    
    // Trigger build hook for variable deletion
    this.buildHooks.triggerBuildHook(
      projectId,
      'variable_update',
      { action: 'delete', variable_id: id }
    ).subscribe({
      next: (deploymentId) => {
        if (deploymentId) {
          console.log('Build hook triggered for variable deletion:', deploymentId);
        }
      },
      error: (error) => console.warn('Build hook failed:', error)
    });
  }
}