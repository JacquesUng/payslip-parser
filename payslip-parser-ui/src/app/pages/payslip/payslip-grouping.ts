import { Payslip } from '../../services/payslip-api.service';

export interface PayslipWithWarning extends Payslip {
  hasOrderIndexCollision: boolean;
}

export interface PayslipGroup {
  month: number;
  year: number;
  payslips: PayslipWithWarning[];
}

export function groupByMonthYear(payslips: Payslip[]): PayslipGroup[] {
  const groups = new Map<string, PayslipGroup>();

  for (const payslip of payslips) {
    const key = `${payslip.year}-${payslip.month}`;
    if (!groups.has(key)) {
      groups.set(key, { month: payslip.month, year: payslip.year, payslips: [] });
    }
    groups.get(key)!.payslips.push({ ...payslip, hasOrderIndexCollision: false });
  }

  for (const group of groups.values()) {
    const counts = new Map<number, number>();
    for (const payslip of group.payslips) {
      counts.set(payslip.orderIndex, (counts.get(payslip.orderIndex) ?? 0) + 1);
    }
    for (const payslip of group.payslips) {
      payslip.hasOrderIndexCollision = (counts.get(payslip.orderIndex) ?? 0) > 1;
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.year - a.year || b.month - a.month);
}
