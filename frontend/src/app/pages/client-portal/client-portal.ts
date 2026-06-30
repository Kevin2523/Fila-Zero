import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QueueData } from '../../core/queue-data';

@Component({
  selector: 'app-client-portal',
  imports: [RouterLink],
  templateUrl: './client-portal.html'
})
export class ClientPortal {
  readonly queue = inject(QueueData);
}
