export type ModuloResumen = {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly ruta: string;
  readonly activo: boolean;
};

export type ResumenSistema = {
  readonly modulosActivos: ModuloResumen[];
  readonly totalUsuariosActivos: number;
  readonly totalOrganizacionesActivas: number;
  readonly totalBienes: number;
  readonly totalOfrendas: number;
};
