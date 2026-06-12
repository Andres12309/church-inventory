export type Organizacion = {
  readonly id: string;
  readonly nivelId: string;
  readonly parentId: string | null;
  readonly nombre: string;
  readonly codigoInterno: string;
  readonly descripcion: string | null;
  readonly activo: boolean;
};
