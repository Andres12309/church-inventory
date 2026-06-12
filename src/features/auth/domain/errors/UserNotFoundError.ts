import { AuthError } from './AuthError';

export class UserNotFoundError extends AuthError {
  constructor(username?: string) {
    super(username ? `Usuario "${username}" no encontrado` : 'Usuario no encontrado');
    this.name = 'UserNotFoundError';
  }
}
