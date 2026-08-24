import { HttpErrorResponse } from '@angular/common/http';

const DEFAULT_FALLBACK = 'Une erreur est survenue.';

export function extractErrorMessage(err: unknown, fallback = DEFAULT_FALLBACK): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }

  const message: unknown = err.error?.message;
  if (typeof message === 'string') {
    return message;
  }
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }
  return fallback;
}
