import { Component, inject } from '@angular/core';
import { QueueData } from '../../core/queue-data';
import { AdminShell } from '../../shared/admin-shell/admin-shell';

@Component({
  selector: 'app-admin-dashboard',
  imports: [AdminShell],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboard {
  readonly queue = inject(QueueData);
}
