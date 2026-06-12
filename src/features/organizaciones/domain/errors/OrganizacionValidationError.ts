import { OrganizacionError } from './OrganizacionError';

export class OrganizacionValidationError extends OrganizacionError {
  constructor(message: string) {
    super(message);
    this.name = 'OrganizacionValidationError';
  }
}
