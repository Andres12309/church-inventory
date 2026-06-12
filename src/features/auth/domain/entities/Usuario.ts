export type Usuario = {
  readonly id: string;
  readonly organizacionId: string;
  readonly roleId: string;
  readonly username: string | null;
  readonly nombre: string;
  readonly email: string | null;
  readonly activo: boolean;
};
