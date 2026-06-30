import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { QueueData, Ticket } from '../../core/queue-data';

@Component({
  selector: 'app-public-occupancy',
  imports: [RouterLink],
  templateUrl: './public-occupancy.html'
})
export class PublicOccupancy implements OnInit {
  readonly queue = inject(QueueData);
  private readonly route = inject(ActivatedRoute);

  isQrAccess = signal<boolean>(false);
  claimedTicket = signal<Ticket | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.isQrAccess.set(params['qr'] === 'true');
    });
  }

  onClaimTurn() {
    const ticket = this.queue.claimTurn();
    this.claimedTicket.set(ticket);
  }
}
