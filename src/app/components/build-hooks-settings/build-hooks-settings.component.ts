import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BuildHooksService, BuildDeployment } from '../../services/build-hooks.service';

@Component({
  selector: 'app-build-hooks-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Build Hooks</h3>
      
      <!-- Build Hook Settings -->
      <div class="space-y-4">
        <div>
          <label for="build-hook-url" class="block text-sm font-medium text-gray-700 mb-1">
            Build Hook URL
          </label>
          <input
            id="build-hook-url"
            type="url"
            [(ngModel)]="buildHookUrl"
            placeholder="https://api.netlify.com/build_hooks/your-hook-id"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            Get this URL from your hosting provider (Netlify, Vercel, etc.)
          </p>
        </div>

        <div class="flex items-center">
          <input
            id="auto-deploy"
            type="checkbox"
            [(ngModel)]="autoDeployEnabled"
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label for="auto-deploy" class="ml-2 block text-sm text-gray-700">
            Auto-deploy when data changes
          </label>
        </div>

        <div class="flex space-x-3">
          <button
            (click)="saveBuildHookSettings()"
            [disabled]="isSaving"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ isSaving ? 'Saving...' : 'Save Settings' }}
          </button>
          
          <button
            (click)="testBuildHook()"
            [disabled]="!buildHookUrl || isTesting"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            {{ isTesting ? 'Testing...' : 'Test Hook' }}
          </button>

          <button
            (click)="triggerManualDeploy()"
            [disabled]="!buildHookUrl || isTriggering"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {{ isTriggering ? 'Triggering...' : 'Deploy Now' }}
          </button>
        </div>

        <!-- Status Messages -->
        <div *ngIf="statusMessage" class="p-3 rounded-md" [ngClass]="{
          'bg-green-100 text-green-800': statusType === 'success',
          'bg-red-100 text-red-800': statusType === 'error',
          'bg-blue-100 text-blue-800': statusType === 'info'
        }">
          {{ statusMessage }}
        </div>

        <!-- Last Deploy Info -->
        <div *ngIf="lastDeployTriggered" class="text-sm text-gray-600">
          Last deploy triggered: {{ lastDeployTriggered | date:'medium' }}
        </div>
      </div>

      <!-- Recent Deployments -->
      <div class="mt-8">
        <h4 class="text-md font-medium text-gray-900 mb-3">Recent Deployments</h4>
        
        <div *ngIf="deployments.length === 0" class="text-gray-500 text-sm">
          No deployments yet
        </div>

        <div *ngIf="deployments.length > 0" class="space-y-2">
          <div 
            *ngFor="let deployment of deployments" 
            class="flex items-center justify-between p-3 bg-gray-50 rounded-md"
          >
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" [ngClass]="{
                  'bg-yellow-100 text-yellow-800': deployment.status === 'pending',
                  'bg-green-100 text-green-800': deployment.status === 'success',
                  'bg-red-100 text-red-800': deployment.status === 'failed'
                }">
                  {{ deployment.status }}
                </span>
                <span class="text-sm text-gray-600">{{ deployment.trigger_reason | titlecase }}</span>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ deployment.triggered_at | date:'short' }}
                <span *ngIf="deployment.response_status">
                  • HTTP {{ deployment.response_status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BuildHooksSettingsComponent implements OnInit {
  @Input() projectId!: string;

  buildHookUrl = '';
  autoDeployEnabled = false;
  lastDeployTriggered?: string;
  
  deployments: BuildDeployment[] = [];
  
  isSaving = false;
  isTesting = false;
  isTriggering = false;
  
  statusMessage = '';
  statusType: 'success' | 'error' | 'info' = 'info';

  constructor(private buildHooks: BuildHooksService) {}

  ngOnInit() {
    this.loadBuildHookSettings();
    this.loadDeploymentHistory();
  }

  private loadBuildHookSettings() {
    this.buildHooks.getBuildHookSettings(this.projectId).subscribe({
      next: (settings) => {
        this.buildHookUrl = settings.build_hook_url || '';
        this.autoDeployEnabled = settings.auto_deploy;
        this.lastDeployTriggered = settings.last_deploy_triggered;
      },
      error: (error) => {
        this.showStatus('Failed to load build hook settings', 'error');
        console.error('Error loading build hook settings:', error);
      }
    });
  }

  private loadDeploymentHistory() {
    this.buildHooks.getDeploymentHistory(this.projectId, 5).subscribe({
      next: (deployments) => {
        this.deployments = deployments;
      },
      error: (error) => {
        console.error('Error loading deployment history:', error);
      }
    });
  }

  saveBuildHookSettings() {
    this.isSaving = true;
    this.buildHooks.updateBuildHookSettings(this.projectId, {
      build_hook_url: this.buildHookUrl || undefined,
      auto_deploy: this.autoDeployEnabled
    }).subscribe({
      next: () => {
        this.showStatus('Build hook settings saved successfully', 'success');
        this.isSaving = false;
      },
      error: (error) => {
        this.showStatus('Failed to save build hook settings', 'error');
        this.isSaving = false;
        console.error('Error saving build hook settings:', error);
      }
    });
  }

  async testBuildHook() {
    if (!this.buildHookUrl) return;
    
    this.isTesting = true;
    try {
      const result = await this.buildHooks.testBuildHook(this.buildHookUrl);
      this.showStatus(result.message, result.success ? 'success' : 'error');
    } catch (error) {
      this.showStatus('Failed to test build hook', 'error');
      console.error('Error testing build hook:', error);
    } finally {
      this.isTesting = false;
    }
  }

  triggerManualDeploy() {
    this.isTriggering = true;
    this.buildHooks.triggerBuildHook(this.projectId, 'manual').subscribe({
      next: (deploymentId) => {
        if (deploymentId) {
          this.showStatus('Manual deployment triggered successfully', 'success');
          this.loadDeploymentHistory(); // Refresh deployment list
        } else {
          this.showStatus('Auto-deploy is disabled', 'info');
        }
        this.isTriggering = false;
      },
      error: (error) => {
        this.showStatus('Failed to trigger deployment', 'error');
        this.isTriggering = false;
        console.error('Error triggering deployment:', error);
      }
    });
  }

  private showStatus(message: string, type: 'success' | 'error' | 'info') {
    this.statusMessage = message;
    this.statusType = type;
    setTimeout(() => {
      this.statusMessage = '';
    }, 5000);
  }
}