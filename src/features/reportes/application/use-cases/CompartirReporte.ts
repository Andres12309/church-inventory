import * as Sharing from 'expo-sharing';

import { ReporteFileStorage } from '../../infrastructure/ReporteFileStorage';

export class ReporteArchivoNoDisponibleError extends Error {
  constructor() {
    super('El archivo del reporte ya no está disponible en el dispositivo');
    this.name = 'ReporteArchivoNoDisponibleError';
  }
}

export class CompartirNoDisponibleError extends Error {
  constructor() {
    super('Compartir archivos no está disponible en este dispositivo');
    this.name = 'CompartirNoDisponibleError';
  }
}

export class CompartirReporte {
  async execute(fileUri: string): Promise<void> {
    if (!ReporteFileStorage.reporteFileExists(fileUri)) {
      throw new ReporteArchivoNoDisponibleError();
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      throw new CompartirNoDisponibleError();
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Compartir reporte Excel',
      UTI: 'com.microsoft.excel.xlsx',
    });
  }
}
