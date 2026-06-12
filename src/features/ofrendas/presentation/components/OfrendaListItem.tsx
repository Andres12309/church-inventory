import { StyleSheet, Text, View } from 'react-native';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import { SocialListCard } from '@/shared/presentation/ui/socialUi';

import { FinanzaNaturaleza } from '../../domain/entities/FinanzaNaturaleza';
import type { Ofrenda } from '../../domain/entities/Ofrenda';
import type { TipoActividad } from '../../domain/entities/TipoActividad';
import { formatearMonto } from '../store/ofrendasStore';

type OfrendaListItemProps = {
  ofrenda: Ofrenda;
  tipoActividad?: TipoActividad;
  onPress: (ofrenda: Ofrenda) => void;
};

export function OfrendaListItem({ ofrenda, tipoActividad, onPress }: OfrendaListItemProps) {
  const esGasto = ofrenda.naturaleza === FinanzaNaturaleza.EGRESO;
  const montoLabel = `${esGasto ? '−' : '+'} ${formatearMonto(ofrenda.monto)}`;

  return (
    <SocialListCard
      title={tipoActividad?.nombre ?? 'Actividad'}
      subtitle={ofrenda.descripcion ?? undefined}
      meta={ofrenda.fecha}
      trailing={
        <View style={styles.trailing}>
          <Text style={[styles.naturalezaBadge, esGasto ? styles.badgeGasto : styles.badgeIngreso]}>
            {esGasto ? 'Gasto' : 'Ingreso'}
          </Text>
          <Text style={[styles.monto, esGasto ? styles.montoGasto : styles.montoIngreso]}>
            {montoLabel}
          </Text>
        </View>
      }
      onPress={() => onPress(ofrenda)}
    />
  );
}

const styles = StyleSheet.create({
  trailing: { alignItems: 'flex-end', gap: 4 },
  naturalezaBadge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgeIngreso: {
    color: PremiumPalette.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeGasto: {
    color: PremiumPalette.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  monto: { fontSize: 15, fontWeight: '800' },
  montoIngreso: { color: PremiumPalette.accent },
  montoGasto: { color: PremiumPalette.danger },
});
