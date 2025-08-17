import { Component, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VariablesService } from '../../services/variables.service';
import { Variable } from '../../models';

@Component({
  selector: 'app-variables-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './variables-manager.component.html',
  styles: []
})
export class VariablesManagerComponent implements OnInit {
  @Input() projectId!: string;

  variables: Variable[] = [];
  showCreateForm = false;
  editingVariable: Variable | null = null;
  showMenuForVariable: string | null = null;
  createForm: FormGroup;
  editForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private variablesService: VariablesService,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      value: ['', [Validators.required, Validators.minLength(1)]]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      value: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.projectId) {
      this.error = 'Project ID is required';
      return;
    }

    await this.loadVariables();
    this.variablesService.variables$.subscribe(variables => {
      this.variables = variables;
    });
  }

  async loadVariables(): Promise<void> {
    try {
      this.loading = true;
      await this.variablesService.loadVariables(this.projectId);
    } catch (error: any) {
      this.error = error.message || 'Failed to load variables';
    } finally {
      this.loading = false;
    }
  }

  showCreateVariableForm(): void {
    this.showCreateForm = true;
    this.error = '';
  }

  hideCreateVariableForm(): void {
    this.showCreateForm = false;
    this.createForm.reset();
    this.error = '';
  }

  async createVariable(): Promise<void> {
    if (!this.createForm.valid) return;

    try {
      this.loading = true;
      const formValue = this.createForm.value;
      await this.variablesService.createVariable({
        project_id: this.projectId,
        name: formValue.name.trim(),
        value: formValue.value.trim()
      });
      this.hideCreateVariableForm();
    } catch (error: any) {
      this.error = error.message || 'Failed to create variable';
    } finally {
      this.loading = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showMenuForVariable = null;
    }
  }

  toggleMenu(variableId: string): void {
    this.showMenuForVariable = this.showMenuForVariable === variableId ? null : variableId;
  }

  startEditVariable(variable: Variable): void {
    this.editingVariable = variable;
    this.showMenuForVariable = null; // Close menu when editing
    this.editForm.patchValue({
      name: variable.name,
      value: variable.value
    });
    this.error = '';
  }

  cancelEditVariable(): void {
    this.editingVariable = null;
    this.editForm.reset();
  }

  async saveVariable(): Promise<void> {
    if (!this.editForm.valid || !this.editingVariable) return;

    try {
      this.loading = true;
      const formValue = this.editForm.value;
      await this.variablesService.updateVariable(this.editingVariable.id, {
        name: formValue.name.trim(),
        value: formValue.value.trim()
      });
      this.editingVariable = null;
      this.editForm.reset();
    } catch (error: any) {
      this.error = error.message || 'Failed to update variable';
    } finally {
      this.loading = false;
    }
  }

  async deleteVariable(variable: Variable): Promise<void> {
    this.showMenuForVariable = null; // Close menu
    
    if (!confirm(`Are you sure you want to delete the variable "${variable.name}"?`)) {
      return;
    }

    try {
      this.loading = true;
      await this.variablesService.deleteVariable(variable.id, this.projectId);
    } catch (error: any) {
      this.error = error.message || 'Failed to delete variable';
    } finally {
      this.loading = false;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}