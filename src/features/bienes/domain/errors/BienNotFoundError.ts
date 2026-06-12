import { BienError } from './BienError';

export class BienNotFoundError extends BienError {
  constructor(id?: string) {
    super(id ? `Bien no encontrado: ${id}` : 'Bien no encontrado');
    this.name = 'BienNotFoundError';
  }
}
