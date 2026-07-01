import { Injectable, computed, signal } from '@angular/core';

export interface Establishment {
  name: string;
  city: string;
  slug: string;
  status: 'Abierto' | 'Pausado' | 'Cerrado';
  schedule: string;
  publicUrl?: string;
  qrUrl?: string;
}

export interface Ticket {
  id: number;
  code: string;
  status: 'espera' | 'atencion' | 'atendido' | 'cancelado';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class QueueData {
  // Dynamically detect server IP so that both PC and Mobile (on the same Wi-Fi) connect correctly
  private readonly host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  private readonly apiUrl = `http://${this.host}:3000/api`;

  readonly establishment = signal<Establishment>({
    name: 'Clínica San Rafael',
    city: 'Penonomé',
    slug: 'clinica-san-rafael',
    status: 'Abierto',
    schedule: '07:00 - 17:00'
  });

  readonly tickets = signal<Ticket[]>([]);
  readonly localIp = signal<string>('localhost');
  readonly stats = signal({
    atendidos: 0,
    enAtencion: 0,
    cancelados: 0,
    promedio: '18 min'
  });

  readonly waitingTickets = computed(() =>
    this.tickets().filter((ticket) => ticket.status === 'espera')
  );

  readonly currentTicket = computed(() =>
    this.tickets().find((ticket) => ticket.status === 'atencion') || null
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

  constructor() {
    this.fetchQueueState();
    // 3-second background polling cycle to sync PC and Mobile views
    if (typeof window !== 'undefined') {
      setInterval(() => this.fetchQueueState(), 3000);
    }
  }

  async fetchQueueState(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/queues/clinica-san-rafael`);
      if (!response.ok) throw new Error('Error al conectar con la API');
      const data = await response.json();
      
      this.establishment.set(data.establishment);
      this.tickets.set(data.tickets);
      this.localIp.set(data.localIp);
      this.stats.set(data.stats);
    } catch (err) {
      console.warn('No se pudo conectar con el backend de Fila-Cero:', err);
    }
  }

  async claimTurn(): Promise<Ticket | null> {
    try {
      const response = await fetch(`${this.apiUrl}/tickets/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'clinica-san-rafael' })
      });
      if (!response.ok) throw new Error('Error al reclamar turno');
      const newTicket = await response.json();

      this.userTicketCode.set(newTicket.code);
      if (typeof window !== 'undefined') {
        localStorage.setItem('fila-cero-ticket', newTicket.code);
      }
      await this.fetchQueueState();
      return newTicket;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async cancelMyTurn(): Promise<void> {
    const client = this.clientTicket();
    if (!client) return;
    try {
      const response = await fetch(`${this.apiUrl}/tickets/${client.id}/cancel`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Error al cancelar turno');

      this.userTicketCode.set(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fila-cero-ticket');
      }
      await this.fetchQueueState();
    } catch (err) {
      console.error(err);
    }
  }

  async callNext(): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/queues/clinica-san-rafael/next`, { method: 'POST' });
      await this.fetchQueueState();
    } catch (err) {
      console.error(err);
    }
  }

  async repeatCurrent(): Promise<void> {
    try {
      // Repeat is a trigger signal; we refresh queue state
      await this.fetchQueueState();
    } catch (err) {
      console.error(err);
    }
  }

  async skipCurrent(): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/queues/clinica-san-rafael/skip`, { method: 'POST' });
      await this.fetchQueueState();
    } catch (err) {
      console.error(err);
    }
  }

  async cancelCurrent(): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/queues/clinica-san-rafael/cancel-current`, { method: 'POST' });
      await this.fetchQueueState();
    } catch (err) {
      console.error(err);
    }
  }

  async toggleAttention(): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/establishments/clinica-san-rafael/toggle-status`, { method: 'POST' });
      await this.fetchQueueState();
    } catch (err) {
      console.error(err);
    }
  }
}
