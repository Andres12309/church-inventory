import { OfrendaError } from './OfrendaError';

export class OfrendaNotFoundError extends OfrendaError {
  constructor(id?: string) {
    super(id ? `Ofrenda no encontrada: ${id}` : 'Ofrenda no encontrada');
    this.name = 'OfrendaNotFoundError';
  }
}
