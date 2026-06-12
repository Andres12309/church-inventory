export class BienError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BienError';
  }
}
