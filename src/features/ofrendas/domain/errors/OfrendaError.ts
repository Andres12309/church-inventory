export class OfrendaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfrendaError';
  }
}
