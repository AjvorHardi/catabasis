import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../../models';

@Component({
  selector: 'app-project-integration-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-integration-guide.component.html'
})
export class ProjectIntegrationGuideComponent implements OnInit {
  @Input() project!: Project;

  copyMessage = '';

  ngOnInit() {
    // Component initialization if needed
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copyMessage = 'Copied to clipboard!';
      setTimeout(() => {
        this.copyMessage = '';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.copyMessage = 'Failed to copy';
      setTimeout(() => {
        this.copyMessage = '';
      }, 2000);
    }
  }
}