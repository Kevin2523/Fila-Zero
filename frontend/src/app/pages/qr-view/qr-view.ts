import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QueueData } from '../../core/queue-data';

@Component({
  selector: 'app-qr-view',
  imports: [RouterLink],
  templateUrl: './qr-view.html'
})
export class QrView implements OnInit {
  readonly queue = inject(QueueData);
  private readonly route = inject(ActivatedRoute);

  slug = signal<string>('clinica-san-rafael');

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['slug']) {
        this.slug.set(params['slug']);
      }
    });
  }

  readonly qrImageUrl = computed(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4300';
    const targetUrl = `${origin}/publica/${this.slug()}?qr=true`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(targetUrl)}`;
  });

  readonly targetUrlText = computed(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4300';
    return `${origin}/publica/${this.slug()}?qr=true`;
  });
}
