import { AuthError } from './AuthError';

export class InvalidPinError extends AuthError {
  constructor() {
    super('PIN incorrecto');
    this.name = 'InvalidPinError';
  }
}
