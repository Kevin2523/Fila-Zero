import { Routes } from '@angular/router';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { ClientPortal } from './pages/client-portal/client-portal';
import { QueueManagement } from './pages/queue-management/queue-management';
import { PublicOccupancy } from './pages/public-occupancy/public-occupancy';

export const routes: Routes = [
  { path: '', redirectTo: 'publica/clinica-san-rafael', pathMatch: 'full' },
  { path: 'publica/:slug', component: PublicOccupancy },
  { path: 'cliente/:slug', component: ClientPortal },
  { path: 'admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'admin/dashboard', component: AdminDashboard },
  { path: 'admin/filas', component: QueueManagement },
  { path: '**', redirectTo: 'publica/clinica-san-rafael' }
];
