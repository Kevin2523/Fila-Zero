import { Component, inject } from '@angular/core';
import { QueueData } from '../../core/queue-data';
import { AdminShell } from '../../shared/admin-shell/admin-shell';

@Component({
  selector: 'app-queue-management',
  imports: [AdminShell],
  templateUrl: './queue-management.html'
})
export class QueueManagement {
  readonly queue = inject(QueueData);
}
