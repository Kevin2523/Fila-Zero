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

  toggleDemoState() {
    this.queue.tickets.update(tickets => {
      const isCurrentlyAtencion = tickets.find(t => t.code === 'A-027')?.status === 'atencion';
      return tickets.map(t => {
        if (t.code === 'A-027') {
          return { ...t, status: isCurrentlyAtencion ? 'espera' : 'atencion' };
        }
        if (t.code === 'A-022') {
          return { ...t, status: isCurrentlyAtencion ? 'atencion' : 'atendido' };
        }
        return t;
      });
    });
  }
}
