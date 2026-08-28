import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { concatMap, from } from 'rxjs';
import { extractErrorMessage } from '../../../core/http-error.util';
import { Payslip, PayslipApiService, UpdatePayslipPayload } from '../../../services/payslip-api.service';

@Component({
  selector: 'app-payslip-edit-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './payslip-edit-modal.html',
  styleUrl: './payslip-edit-modal.scss',
})
export class PayslipEditModal implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(PayslipApiService);

  payslip = input.required<Payslip>();
  closed = output<void>();
  saved = output<void>();

  form = this.fb.group({
    company: ['', [Validators.required, Validators.minLength(1)]],
  });

  monthPayslips = signal<Payslip[]>([]);
  loading = signal(true);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  private originalOrder: Payslip[] = [];

  ngOnInit(): void {
    this.form.setValue({ company: this.payslip().company });
    this.api.list({ month: this.payslip().month, year: this.payslip().year }).subscribe((payslips) => {
      const sorted = [...payslips].sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id));
      this.originalOrder = sorted;
      this.monthPayslips.set(sorted);
      this.loading.set(false);
    });
  }

  moveUp(index: number): void {
    if (index <= 0) {
      return;
    }
    this.swap(index, index - 1);
  }

  moveDown(index: number): void {
    if (index >= this.monthPayslips().length - 1) {
      return;
    }
    this.swap(index, index + 1);
  }

  private swap(i: number, j: number): void {
    this.monthPayslips.update((list) => {
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  cancel(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const editedId = this.payslip().id;
    const company = this.form.getRawValue().company;

    const changed: { id: string; payload: UpdatePayslipPayload }[] = [];
    this.monthPayslips().forEach((payslip, index) => {
      const original = this.originalOrder.find((p) => p.id === payslip.id);
      const payload: UpdatePayslipPayload = {};

      if (payslip.id === editedId && company !== original?.company) {
        payload.company = company;
      }
      if (index !== original?.orderIndex) {
        payload.orderIndex = index;
      }

      if (Object.keys(payload).length > 0) {
        changed.push({ id: payslip.id, payload });
      }
    });

    if (changed.length === 0) {
      this.saved.emit();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    from(changed)
      .pipe(concatMap(({ id, payload }) => this.api.update(id, payload)))
      .subscribe({
        complete: () => {
          this.submitting.set(false);
          this.saved.emit();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(extractErrorMessage(err));
        },
      });
  }
}
