import { SocialListCard } from '@/shared/presentation/ui/socialUi';

import type { Ofrenda } from '../../domain/entities/Ofrenda';
import type { TipoActividad } from '../../domain/entities/TipoActividad';
import { formatearMonto } from '../store/ofrendasStore';

type OfrendaListItemProps = {
  ofrenda: Ofrenda;
  tipoActividad?: TipoActividad;
  onPress: (ofrenda: Ofrenda) => void;
};

export function OfrendaListItem({ ofrenda, tipoActividad, onPress }: OfrendaListItemProps) {
  return (
    <SocialListCard
      title={tipoActividad?.nombre ?? 'Actividad'}
      subtitle={ofrenda.descripcion ?? undefined}
      meta={ofrenda.fecha}
      trailing={formatearMonto(ofrenda.monto)}
      trailingAccent
      onPress={() => onPress(ofrenda)}
    />
  );
}
