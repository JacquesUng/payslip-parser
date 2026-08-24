import { Routes } from '@angular/router';
import { Welcome } from './pages/welcome/welcome';
import { PayslipPage } from './pages/payslip/payslip';

export const routes: Routes = [
  { path: 'welcome', component: Welcome },
  { path: 'payslip', component: PayslipPage },
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
];
