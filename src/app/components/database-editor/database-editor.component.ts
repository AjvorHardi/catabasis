import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatabasesService } from '../../services/databases.service';
import { Database, DatabaseRow } from '../../models';

@Component({
  selector: 'app-database-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './database-editor.component.html',
  styles: []
})
export class DatabaseEditorComponent implements OnInit {
  @Input() database!: Database;

  rows: DatabaseRow[] = [];
  editingCell: { rowId: string; column: string } | null = null;
  editValue = '';
  loading = false;
  error = '';

  constructor(
    private databasesService: DatabasesService,
    private fb: FormBuilder
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.database) {
      this.error = 'Database is required';
      return;
    }

    await this.loadRows();
    this.databasesService.rows$.subscribe(rows => {
      this.rows = rows;
    });
  }

  async loadRows(): Promise<void> {
    try {
      this.loading = true;
      await this.databasesService.loadDatabaseRows(this.database.id);
    } catch (error: any) {
      this.error = error.message || 'Failed to load database rows';
    } finally {
      this.loading = false;
    }
  }

  async addNewRow(): Promise<void> {
    try {
      this.loading = true;
      // Create empty row with all columns initialized to empty strings
      const emptyData: Record<string, string> = {};
      this.database.columns.forEach(column => {
        emptyData[column] = '';
      });

      await this.databasesService.createDatabaseRow({
        database_id: this.database.id,
        data: emptyData
      });
    } catch (error: any) {
      this.error = error.message || 'Failed to add new row';
    } finally {
      this.loading = false;
    }
  }

  async deleteRow(row: DatabaseRow): Promise<void> {
    if (!confirm('Are you sure you want to delete this row?')) {
      return;
    }

    try {
      this.loading = true;
      await this.databasesService.deleteDatabaseRow(row.id, this.database.id);
    } catch (error: any) {
      this.error = error.message || 'Failed to delete row';
    } finally {
      this.loading = false;
    }
  }

  startEditCell(rowId: string, column: string, currentValue: string): void {
    this.editingCell = { rowId, column };
    this.editValue = currentValue || '';
  }

  cancelEdit(): void {
    this.editingCell = null;
    this.editValue = '';
  }

  async saveCell(): Promise<void> {
    if (!this.editingCell) return;

    const { rowId, column } = this.editingCell;
    const row = this.rows.find(r => r.id === rowId);
    
    if (!row) return;

    // Validate non-empty value
    if (!this.editValue.trim()) {
      this.error = 'Cell value cannot be empty';
      return;
    }

    try {
      this.loading = true;
      // Update the data object with new value
      const updatedData = {
        ...row.data,
        [column]: this.editValue.trim()
      };

      await this.databasesService.updateDatabaseRow(rowId, updatedData);
      this.cancelEdit();
    } catch (error: any) {
      this.error = error.message || 'Failed to save cell';
    } finally {
      this.loading = false;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveCell();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  getCellValue(row: DatabaseRow, column: string): string {
    return row.data[column] || '';
  }

  isEditing(rowId: string, column: string): boolean {
    return this.editingCell?.rowId === rowId && this.editingCell?.column === column;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}