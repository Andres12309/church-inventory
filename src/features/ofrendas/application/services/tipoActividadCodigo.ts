export function slugTipoActividadCodigo(nombre: string): string {
  const base = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

  return base.length > 0 ? base : 'tipo_actividad';
}

export function codigoTipoActividadUnico(base: string, existentes: Set<string>): string {
  if (!existentes.has(base)) {
    return base;
  }

  let suffix = 2;
  while (existentes.has(`${base}_${suffix}`)) {
    suffix += 1;
  }

  return `${base}_${suffix}`;
}
