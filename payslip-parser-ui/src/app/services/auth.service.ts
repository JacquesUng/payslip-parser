import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface AuthResponse {
  email: string;
}

const BASE_URL = '/payslip-api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly http: HttpClient) {}

  signup(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE_URL}/signup`, { email, password });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${BASE_URL}/login`, { email, password });
  }

  logout(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${BASE_URL}/logout`, {});
  }

  me(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${BASE_URL}/me`);
  }
}
