import { Component, inject, computed } from '@angular/core';
import { QueueData } from '../../core/queue-data';
import { AdminShell } from '../../shared/admin-shell/admin-shell';

@Component({
  selector: 'app-admin-dashboard',
  imports: [AdminShell],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboard {
  readonly queue = inject(QueueData);

  readonly svgPaths = computed(() => {
    const points = this.queue.chartPoints;
    const width = 800;
    const height = 180;
    const padding = 20;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;
    const maxVal = 40; // Scale max height to 40 people
    
    const coords = points.map((val, idx) => {
      const x = padding + (idx / (points.length - 1)) * chartWidth;
      const y = height - padding - (val / maxVal) * chartHeight;
      return { x, y, val };
    });
    
    let linePath = '';
    let areaPath = '';
    
    if (coords.length > 0) {
      linePath = `M ${coords[0].x} ${coords[0].y}`;
      areaPath = `M ${coords[0].x} ${height - padding} L ${coords[0].x} ${coords[0].y}`;
      
      for (let i = 1; i < coords.length; i++) {
        const p0 = coords[i - 1];
        const p = coords[i];
        const cp1x = p0.x + (p.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p.x - p0.x) / 2;
        const cp2y = p.y;
        
        linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
        areaPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
      }
      
      areaPath += ` L ${coords[coords.length - 1].x} ${height - padding} Z`;
    }
    
    return { linePath, areaPath, coords };
  });
}
