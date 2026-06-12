import { Redirect } from 'expo-router';

import { REPORTES_ROUTES } from '@/features/reportes/presentation/routes';

export default function ReportesLegacyRedirect() {
  return <Redirect href={REPORTES_ROUTES.listado} />;
}
