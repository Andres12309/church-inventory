import { OrganizacionError } from './OrganizacionError';

export class OrganizacionNotFoundError extends OrganizacionError {
  constructor(id?: string) {
    super(id ? `Organización no encontrada: ${id}` : 'Organización no encontrada');
    this.name = 'OrganizacionNotFoundError';
  }
}
