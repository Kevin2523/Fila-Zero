import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QueueData } from '../../core/queue-data';

@Component({
  selector: 'app-public-occupancy',
  imports: [RouterLink],
  templateUrl: './public-occupancy.html'
})
export class PublicOccupancy {
  readonly queue = inject(QueueData);
}
