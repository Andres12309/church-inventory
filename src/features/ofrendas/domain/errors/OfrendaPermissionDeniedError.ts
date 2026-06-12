import { OfrendaError } from './OfrendaError';

export class OfrendaPermissionDeniedError extends OfrendaError {
  constructor() {
    super('No tienes permiso para gestionar ofrendas en esta organización');
    this.name = 'OfrendaPermissionDeniedError';
  }
}
