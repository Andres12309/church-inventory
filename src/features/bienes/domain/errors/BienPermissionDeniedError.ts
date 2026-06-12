import { BienError } from './BienError';

export class BienPermissionDeniedError extends BienError {
  constructor() {
    super('No tienes permiso para gestionar bienes en esta organización');
    this.name = 'BienPermissionDeniedError';
  }
}
