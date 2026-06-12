import * as Location from 'expo-location';

export type CoordenadasActuales = {
  latitud: number;
  longitud: number;
};

export class LocationPermissionDeniedError extends Error {
  constructor() {
    super('Permiso de ubicación denegado');
    this.name = 'LocationPermissionDeniedError';
  }
}

export async function obtenerUbicacionActual(): Promise<CoordenadasActuales> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== Location.PermissionStatus.GRANTED) {
    throw new LocationPermissionDeniedError();
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitud: position.coords.latitude,
    longitud: position.coords.longitude,
  };
}
