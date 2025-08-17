import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ProjectDetailComponent } from './components/project-detail/project-detail.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'project/:id', component: ProjectDetailComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];
