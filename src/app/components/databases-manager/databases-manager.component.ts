import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { DatabasesService } from '../../services/databases.service';
import { DatabaseEditorComponent } from '../database-editor/database-editor.component';
import { Database } from '../../models';

@Component({
  selector: 'app-databases-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatabaseEditorComponent],
  templateUrl: './databases-manager.component.html',
  styles: []
})
export class DatabasesManagerComponent implements OnInit {
  @Input() projectId!: string;

  databases: Database[] = [];
  selectedDatabase: Database | null = null;
  showCreateForm = false;
  createForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private databasesService: DatabasesService,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      columns: this.fb.array([this.createColumnControl()], [Validators.required, Validators.minLength(1)])
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.projectId) {
      this.error = 'Project ID is required';
      return;
    }

    await this.loadDatabases();
    this.databasesService.databases$.subscribe(databases => {
      this.databases = databases;
    });
  }

  get columnsArray(): FormArray {
    return this.createForm.get('columns') as FormArray;
  }

  createColumnControl(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  addColumn(): void {
    this.columnsArray.push(this.createColumnControl());
  }

  removeColumn(index: number): void {
    if (this.columnsArray.length > 1) {
      this.columnsArray.removeAt(index);
    }
  }

  async loadDatabases(): Promise<void> {
    try {
      this.loading = true;
      await this.databasesService.loadDatabases(this.projectId);
    } catch (error: any) {
      this.error = error.message || 'Failed to load databases';
    } finally {
      this.loading = false;
    }
  }

  showCreateDatabaseForm(): void {
    this.showCreateForm = true;
    this.error = '';
  }

  hideCreateDatabaseForm(): void {
    this.showCreateForm = false;
    this.createForm.reset();
    // Reset to default one column
    this.createForm.setControl('columns', this.fb.array([this.createColumnControl()]));
    this.error = '';
  }

  async createDatabase(): Promise<void> {
    if (!this.createForm.valid) return;

    try {
      this.loading = true;
      const formValue = this.createForm.value;
      const columns = formValue.columns
        .map((col: any) => col.name?.trim())
        .filter((name: string) => name && name.length > 0);

      if (columns.length === 0) {
        this.error = 'At least one column is required';
        return;
      }

      await this.databasesService.createDatabase({
        project_id: this.projectId,
        name: formValue.name.trim(),
        description: formValue.description?.trim() || undefined,
        columns: columns
      });
      this.hideCreateDatabaseForm();
    } catch (error: any) {
      this.error = error.message || 'Failed to create database';
    } finally {
      this.loading = false;
    }
  }

  async deleteDatabase(database: Database): Promise<void> {
    if (!confirm(`Are you sure you want to delete the database "${database.name}"? This will also delete all data inside it.`)) {
      return;
    }

    try {
      this.loading = true;
      await this.databasesService.deleteDatabase(database.id, this.projectId);
      if (this.selectedDatabase?.id === database.id) {
        this.selectedDatabase = null;
      }
    } catch (error: any) {
      this.error = error.message || 'Failed to delete database';
    } finally {
      this.loading = false;
    }
  }

  selectDatabase(database: Database): void {
    this.selectedDatabase = database;
  }

  backToDatabasesList(): void {
    this.selectedDatabase = null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}