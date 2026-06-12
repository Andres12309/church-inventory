import { OrganizacionError } from './OrganizacionError';

export class OrganizacionPermissionDeniedError extends OrganizacionError {
  constructor() {
    super('No tienes permiso para administrar organizaciones');
    this.name = 'OrganizacionPermissionDeniedError';
  }
}
