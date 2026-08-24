import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-protected-layout',
  imports: [RouterOutlet],
  templateUrl: './protected-layout.html',
  styleUrl: './protected-layout.scss',
})
export class ProtectedLayout implements OnInit {
  email = signal<string | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe(({ email }) => this.email.set(email));
  }

  logout(): void {
    this.authService.logout().subscribe(() => this.router.navigate(['/welcome']));
  }
}
