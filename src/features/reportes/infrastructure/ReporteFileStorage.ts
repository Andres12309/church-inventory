import { Directory, File, Paths } from 'expo-file-system';

const REPORTES_DIR_NAME = 'reportes';

function getReportesDirectory(): Directory {
  return new Directory(Paths.document, REPORTES_DIR_NAME);
}

export function ensureReportesDirectory(): Directory {
  const dir = getReportesDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export function guardarReporteXlsx(filename: string, bytes: Uint8Array): string {
  const dir = ensureReportesDirectory();
  const file = new File(dir, filename);

  if (file.exists) {
    file.delete();
  }

  file.write(bytes);
  return file.uri;
}

export function reporteFileExists(fileUri: string): boolean {
  const file = new File(fileUri);
  return file.exists;
}

export const ReporteFileStorage = {
  ensureReportesDirectory,
  guardarReporteXlsx,
  reporteFileExists,
};
