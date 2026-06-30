import { Routes } from '@angular/router';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { ClientPortal } from './pages/client-portal/client-portal';
import { QueueManagement } from './pages/queue-management/queue-management';
import { PublicOccupancy } from './pages/public-occupancy/public-occupancy';
import { Login } from './pages/login/login';
import { authGuard } from './core/auth.guard';
import { QrView } from './pages/qr-view/qr-view';

export const routes: Routes = [
  { path: '', redirectTo: 'publica/clinica-san-rafael', pathMatch: 'full' },
  { path: 'publica/:slug', component: PublicOccupancy },
  { path: 'cliente/:slug', component: ClientPortal },
  { path: 'login', component: Login },
  { path: 'qr/:slug', component: QrView },
  { path: 'qr', redirectTo: 'qr/clinica-san-rafael', pathMatch: 'full' },
  { path: 'admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'admin/dashboard', component: AdminDashboard, canActivate: [authGuard] },
  { path: 'admin/filas', component: QueueManagement, canActivate: [authGuard] },
  { path: '**', redirectTo: 'publica/clinica-san-rafael' }
];
