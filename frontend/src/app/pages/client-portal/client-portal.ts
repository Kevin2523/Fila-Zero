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
    // Si no hay un ticket activo seleccionado, asignamos 'A-027' para simularlo
    if (!this.queue.userTicketCode()) {
      this.queue.userTicketCode.set('A-027');
    }

    this.queue.tickets.update(tickets => {
      const hasClientTicket = tickets.some(t => t.code === 'A-027');
      const ticketList = hasClientTicket 
        ? tickets 
        : [...tickets, { id: 27, code: 'A-027', status: 'espera', createdAt: '10:24 a.m.' }];

      const isCurrentlyAtencion = ticketList.find(t => t.code === 'A-027')?.status === 'atencion';
      return ticketList.map(t => {
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
