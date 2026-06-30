import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html'
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = signal('');
  password = signal('');
  errorMessage = signal('');
  isLoading = signal(false);

  onSubmit(event: Event): void {
    event.preventDefault();
    this.errorMessage.set('');
    this.isLoading.set(true);

    // Simular un retraso corto y limpio para mejorar la transición
    setTimeout(() => {
      this.authService.login(this.username(), this.password());
      this.isLoading.set(false);
      this.router.navigate(['/admin/dashboard']);
    }, 400);
  }
}
