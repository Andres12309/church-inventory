export class UsuarioLocalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsuarioLocalError';
  }
}

export class UsuarioPermissionDeniedError extends UsuarioLocalError {
  constructor() {
    super('No tienes permiso para registrar usuarios');
    this.name = 'UsuarioPermissionDeniedError';
  }
}

export class UsuarioValidationError extends UsuarioLocalError {
  constructor(message: string) {
    super(message);
    this.name = 'UsuarioValidationError';
  }
}
