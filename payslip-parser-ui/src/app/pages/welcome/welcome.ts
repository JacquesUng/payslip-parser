import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { extractErrorMessage } from '../../core/http-error.util';
import { AuthService } from '../../services/auth.service';

type Mode = 'login' | 'signup';

@Component({
  selector: 'app-welcome',
  imports: [ReactiveFormsModule],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class Welcome {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  mode = signal<Mode>('login');
  errorMessage = signal<string | null>(null);
  submitting = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  signupForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'signup' : 'login');
    this.errorMessage.set(null);
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.authService.login(email, password).subscribe({
      next: () => this.router.navigate(['/payslip']),
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(extractErrorMessage(err));
      },
    });
  }

  submitSignup(): void {
    if (this.signupForm.invalid) {
      return;
    }

    const { email, password, confirmPassword } = this.signupForm.getRawValue();
    if (password !== confirmPassword) {
      this.errorMessage.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    this.authService.signup(email, password).subscribe({
      next: () => this.router.navigate(['/payslip']),
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(extractErrorMessage(err));
      },
    });
  }
}
