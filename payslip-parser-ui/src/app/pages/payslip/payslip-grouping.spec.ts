import { Payslip } from '../../services/payslip-api.service';
import { groupByMonthYear } from './payslip-grouping';

const buildPayslip = (overrides: Partial<Payslip> = {}): Payslip => ({
  id: 'id-1',
  month: 6,
  year: 2026,
  company: 'Acme',
  orderIndex: 0,
  originalFileName: 'payslip.pdf',
  mimeType: 'application/pdf',
  fileSize: 100,
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

describe('groupByMonthYear', () => {
  it('groups payslips by (month, year), most recent first', () => {
    const payslips = [
      buildPayslip({ id: 'a', month: 1, year: 2026 }),
      buildPayslip({ id: 'b', month: 6, year: 2026 }),
      buildPayslip({ id: 'c', month: 1, year: 2025 }),
    ];

    const groups = groupByMonthYear(payslips);

    expect(groups.map((g) => `${g.year}-${g.month}`)).toEqual(['2026-6', '2026-1', '2025-1']);
  });

  it('does not flag a collision when orderIndex values are unique within a group', () => {
    const payslips = [
      buildPayslip({ id: 'a', orderIndex: 0 }),
      buildPayslip({ id: 'b', orderIndex: 1 }),
    ];

    const groups = groupByMonthYear(payslips);

    expect(groups[0].payslips.every((p) => !p.hasOrderIndexCollision)).toBe(true);
  });

  it('flags every payslip sharing an orderIndex within the same group', () => {
    const payslips = [
      buildPayslip({ id: 'a', orderIndex: 0 }),
      buildPayslip({ id: 'b', orderIndex: 0 }),
      buildPayslip({ id: 'c', orderIndex: 1 }),
    ];

    const groups = groupByMonthYear(payslips);
    const byId = Object.fromEntries(groups[0].payslips.map((p) => [p.id, p]));

    expect(byId['a'].hasOrderIndexCollision).toBe(true);
    expect(byId['b'].hasOrderIndexCollision).toBe(true);
    expect(byId['c'].hasOrderIndexCollision).toBe(false);
  });

  it('does not flag a collision across different (month, year) groups', () => {
    const payslips = [
      buildPayslip({ id: 'a', month: 1, year: 2026, orderIndex: 0 }),
      buildPayslip({ id: 'b', month: 2, year: 2026, orderIndex: 0 }),
    ];

    const groups = groupByMonthYear(payslips);

    for (const group of groups) {
      expect(group.payslips.every((p) => !p.hasOrderIndexCollision)).toBe(true);
    }
  });
});
