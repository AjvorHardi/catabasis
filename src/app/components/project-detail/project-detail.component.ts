import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectsService } from '../../services/projects.service';
import { VariablesManagerComponent } from '../variables-manager/variables-manager.component';
import { DatabasesManagerComponent } from '../databases-manager/databases-manager.component';
import { Project } from '../../models';
import { ProjectIntegrationGuideComponent } from '../project-integration-guide/project-integration-guide.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, VariablesManagerComponent, DatabasesManagerComponent, ProjectIntegrationGuideComponent],
  templateUrl: './project-detail.component.html',
  styles: []
})
export class ProjectDetailComponent implements OnInit {
  project: Project | null = null;
  activeTab: 'guide' | 'variables' | 'databases' = 'guide';
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: ProjectsService
  ) {}

  async ngOnInit(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      this.router.navigate(['/dashboard']);
      return;
    }

    await this.loadProject(projectId);
  }

  async loadProject(id: string): Promise<void> {
    try {
      this.loading = true;
      this.project = await this.projectsService.getProject(id);
      if (!this.project) {
        this.error = 'Project not found';
      }
    } catch (error: any) {
      this.error = error.message || 'Failed to load project';
    } finally {
      this.loading = false;
    }
  }

  setActiveTab(tab: 'guide' | 'variables' | 'databases'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}