import { Routes } from '@angular/router';
import { authenticatedGuard } from './core/guards/authenticated.guard';
import { unauthenticatedGuard } from './core/guards/unauthenticated.guard';
import { ProtectedLayout } from './layout/protected-layout/protected-layout';
import { Welcome } from './pages/welcome/welcome';
import { PayslipPage } from './pages/payslip/payslip';

export const routes: Routes = [
  { path: 'welcome', component: Welcome, canActivate: [unauthenticatedGuard] },
  {
    path: 'payslip',
    component: ProtectedLayout,
    canActivate: [authenticatedGuard],
    children: [{ path: '', component: PayslipPage }],
  },
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
];
