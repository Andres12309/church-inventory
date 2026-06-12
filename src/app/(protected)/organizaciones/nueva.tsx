import { Redirect } from 'expo-router';

/** @deprecated Usar capilla/nuevo */
export default function NuevaCapillaLegacyRoute() {
  return <Redirect href="/(protected)/organizaciones" />;
}
