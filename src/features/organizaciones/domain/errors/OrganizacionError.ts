export class OrganizacionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrganizacionError';
  }
}
