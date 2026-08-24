import { Component, OnInit, computed, signal } from '@angular/core';
import { Payslip, PayslipApiService } from '../../services/payslip-api.service';
import { groupByMonthYear } from './payslip-grouping';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-payslip',
  imports: [],
  templateUrl: './payslip.html',
  styleUrl: './payslip.scss',
})
export class PayslipPage implements OnInit {
  payslips = signal<Payslip[]>([]);
  page = signal(1);
  selectedFile: File | null = null;

  pageCount = computed(() => Math.max(1, Math.ceil(this.payslips().length / PAGE_SIZE)));

  groups = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    const pagePayslips = this.payslips().slice(start, start + PAGE_SIZE);
    return groupByMonthYear(pagePayslips);
  });

  constructor(private readonly api: PayslipApiService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.list({}).subscribe((payslips) => this.payslips.set(payslips));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  upload(): void {
    if (!this.selectedFile) {
      return;
    }
    this.api.upload(this.selectedFile).subscribe(() => {
      this.selectedFile = null;
      this.refresh();
    });
  }

  saveEdit(payslip: Payslip, company: string, orderIndex: number): void {
    this.api.update(payslip.id, { company, orderIndex }).subscribe(() => this.refresh());
  }

  remove(payslip: Payslip): void {
    if (!window.confirm(`Supprimer la fiche de paie "${payslip.originalFileName}" ?`)) {
      return;
    }
    this.api.delete(payslip.id).subscribe(() => this.refresh());
  }

  previousPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  nextPage(): void {
    this.page.update((p) => Math.min(this.pageCount(), p + 1));
  }
}
