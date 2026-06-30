import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'fila_zero_auth_token';
  readonly isLoggedIn = signal<boolean>(!!localStorage.getItem(this.storageKey));

  login(username: string, password: string): boolean {
    // Simulación sencilla en frontend - Permite entrar de inmediato
    localStorage.setItem(this.storageKey, 'simulated-jwt-token-fila-zero');
    this.isLoggedIn.set(true);
    return true;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.isLoggedIn.set(false);
  }
}
