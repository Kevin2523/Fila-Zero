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

  readonly nextTicket = computed<Ticket | undefined>(() => this.waitingTickets()[0]);

  readonly peopleInLine = computed(() => this.waitingTickets().length + (this.currentTicket() ? 1 : 0));
  readonly estimatedMinutes = computed(() => this.peopleInLine() * 5);
  readonly userTicketCode = signal<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('fila-cero-ticket') : null
  );

  readonly clientTicket = computed(() => {
    const code = this.userTicketCode();
    if (!code) return null;
    return this.tickets().find((ticket) => ticket.code === code) || null;
  });

  readonly peopleAheadOfClient = computed(() => {
    const client = this.clientTicket();
    if (!client || client.status !== 'espera') return 0;
    return this.waitingTickets().filter((ticket) => ticket.id < client.id).length;
  });

  readonly estimatedClientMinutes = computed(() => {
    const ahead = this.peopleAheadOfClient();
    return (ahead + 1) * 5;
  });

  readonly chartPoints = [10, 16, 25, 28, 20, 27, 21, 28, 26];
  readonly chartLabels = ['7am', '', '8am', '9am', '', '10am', '11am', '', '12pm'];

  claimTurn(): Ticket {
    const currentTickets = this.tickets();
    let nextId = 1;
    let nextNum = 1;
    if (currentTickets.length > 0) {
      const ids = currentTickets.map(t => t.id);
      nextId = Math.max(...ids) + 1;
      
      const codes = currentTickets.map(t => {
        const match = t.code.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      });
      nextNum = Math.max(...codes) + 1;
    }
    
    const paddedNum = String(nextNum).padStart(3, '0');
    const code = `A-${paddedNum}`;
    
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    const newTicket: Ticket = {
      id: nextId,
      code: code,
      status: 'espera',
      createdAt: timeStr
    };
    
    this.tickets.update(t => [...t, newTicket]);
    this.userTicketCode.set(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fila-cero-ticket', code);
    }
    return newTicket;
  }

  cancelMyTurn(): void {
    const client = this.clientTicket();
    if (!client) return;
    this.tickets.update((tickets) =>
      tickets.map((t) => (t.id === client.id ? { ...t, status: 'cancelado' } : t))
    );
    this.userTicketCode.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fila-cero-ticket');
    }
  }

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
