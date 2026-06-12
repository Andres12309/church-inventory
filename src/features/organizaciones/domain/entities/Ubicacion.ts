export type Ubicacion = {
  readonly id: string;
  readonly organizacionId: string;
  readonly direccion: string;
  readonly ciudad: string | null;
  readonly provincia: string | null;
  readonly pais: string;
  readonly latitud: number | null;
  readonly longitud: number | null;
};
