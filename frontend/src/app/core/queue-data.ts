import { Injectable, computed, signal } from '@angular/core';

export interface Establishment {
  name: string;
  city: string;
  slug: string;
  status: 'Abierto' | 'Pausado' | 'Cerrado';
  schedule: string;
  publicUrl: string;
  qrUrl: string;
}

export interface Ticket {
  id: number;
  code: string;
  status: 'espera' | 'atencion' | 'atendido' | 'cancelado';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class QueueData {
  readonly establishment = signal<Establishment>({
    name: 'Clínica San Rafael',
    city: 'Penonomé',
    slug: 'clinica-san-rafael',
    status: 'Abierto',
    schedule: '7:00 a.m. - 5:00 p.m.',
    publicUrl: '/publica/clinica-san-rafael',
    qrUrl: '/cliente/clinica-san-rafael'
  });

  readonly tickets = signal<Ticket[]>([
    { id: 22, code: 'A-022', status: 'atencion', createdAt: '10:06 a.m.' },
    { id: 23, code: 'A-023', status: 'espera', createdAt: '10:09 a.m.' },
    { id: 24, code: 'A-024', status: 'espera', createdAt: '10:13 a.m.' },
    { id: 25, code: 'A-025', status: 'espera', createdAt: '10:16 a.m.' },
    { id: 26, code: 'A-026', status: 'espera', createdAt: '10:19 a.m.' },
    { id: 27, code: 'A-027', status: 'espera', createdAt: '10:24 a.m.' },
    { id: 28, code: 'A-028', status: 'espera', createdAt: '10:27 a.m.' }
  ]);

  readonly waitingTickets = computed(() =>
    this.tickets().filter((ticket) => ticket.status === 'espera')
  );

  readonly currentTicket = computed(() =>
    this.tickets().find((ticket) => ticket.status === 'atencion')
  );

  readonly nextTicket = computed(() => this.waitingTickets()[0]);

  readonly peopleInLine = computed(() => this.waitingTickets().length + (this.currentTicket() ? 1 : 0));
  readonly estimatedMinutes = computed(() => this.peopleInLine() * 5);
  readonly clientTicket = computed(() => this.tickets().find((ticket) => ticket.code === 'A-027'));
  readonly peopleAheadOfClient = computed(() => {
    const client = this.clientTicket();
    if (!client) return 0;
    return this.waitingTickets().filter((ticket) => ticket.id < client.id).length;
  });

  readonly chartPoints = [10, 16, 25, 28, 20, 27, 21, 28, 26];
  readonly chartLabels = ['7am', '', '8am', '9am', '', '10am', '11am', '', '12pm'];

  callNext(): void {
    const current = this.currentTicket();
    const next = this.nextTicket();
    this.tickets.update((tickets) =>
      tickets.map((ticket) => {
        if (current && ticket.id === current.id) return { ...ticket, status: 'atendido' };
        if (next && ticket.id === next.id) return { ...ticket, status: 'atencion' };
        return ticket;
      })
    );
  }

  repeatCurrent(): void {
    return;
  }

  skipCurrent(): void {
    const current = this.currentTicket();
    const next = this.nextTicket();
    if (!current || !next) return;
    this.tickets.update((tickets) =>
      tickets.map((ticket) => {
        if (ticket.id === current.id) return { ...ticket, status: 'espera' };
        if (ticket.id === next.id) return { ...ticket, status: 'atencion' };
        return ticket;
      })
    );
  }

  cancelCurrent(): void {
    const current = this.currentTicket();
    const next = this.nextTicket();
    this.tickets.update((tickets) =>
      tickets.map((ticket) => {
        if (current && ticket.id === current.id) return { ...ticket, status: 'cancelado' };
        if (next && ticket.id === next.id) return { ...ticket, status: 'atencion' };
        return ticket;
      })
    );
  }

  toggleAttention(): void {
    this.establishment.update((place) => ({
      ...place,
      status: place.status === 'Abierto' ? 'Cerrado' : 'Abierto'
    }));
  }
}
