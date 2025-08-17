import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectsService } from '../../services/projects.service';
import { Project } from '../../models';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './projects-list.component.html',
  styles: []
})
export class ProjectsListComponent implements OnInit {
  projects: Project[] = [];
  showCreateForm = false;
  createForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private projectsService: ProjectsService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: ['']
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadProjects();
    this.projectsService.projects$.subscribe(projects => {
      this.projects = projects;
    });
  }

  async loadProjects(): Promise<void> {
    try {
      this.loading = true;
      await this.projectsService.loadProjects();
    } catch (error: any) {
      this.error = error.message || 'Failed to load projects';
    } finally {
      this.loading = false;
    }
  }

  showCreateProjectForm(): void {
    this.showCreateForm = true;
    this.error = '';
  }

  hideCreateProjectForm(): void {
    this.showCreateForm = false;
    this.createForm.reset();
    this.error = '';
  }

  async createProject(): Promise<void> {
    if (!this.createForm.valid) return;

    try {
      this.loading = true;
      const formValue = this.createForm.value;
      await this.projectsService.createProject({
        name: formValue.name.trim(),
        description: formValue.description?.trim() || undefined
      });
      this.hideCreateProjectForm();
    } catch (error: any) {
      this.error = error.message || 'Failed to create project';
    } finally {
      this.loading = false;
    }
  }

  async deleteProject(project: Project): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This will also delete all variables and databases inside it.`)) {
      return;
    }

    try {
      this.loading = true;
      await this.projectsService.deleteProject(project.id);
    } catch (error: any) {
      this.error = error.message || 'Failed to delete project';
    } finally {
      this.loading = false;
    }
  }

  openProject(project: Project): void {
    this.router.navigate(['/project', project.id]);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}