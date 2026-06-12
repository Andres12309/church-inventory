import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import { SocialListCard } from '@/shared/presentation/ui/socialUi';
import type { BienEstadoValue } from '@/shared/infrastructure/database/schema';

import type { Bien } from '../../domain/entities/Bien';
import type { CategoriaBien } from '../../domain/entities/CategoriaBien';

const ESTADO_LABELS: Record<BienEstadoValue, string> = {
  excelente: 'Excelente',
  bueno: 'Bueno',
  regular: 'Regular',
  malo: 'Malo',
};

type BienListItemProps = {
  bien: Bien;
  categoria?: CategoriaBien;
  onPress: (bien: Bien) => void;
};

export function BienListItem({ bien, categoria, onPress }: BienListItemProps) {
  const trailing =
    bien.valorEstimado != null ? `$${bien.valorEstimado.toFixed(2)}` : `×${bien.cantidad}`;

  return (
    <SocialListCard
      title={bien.nombre}
      subtitle={categoria?.nombre ?? 'Sin categoría'}
      meta={`${ESTADO_LABELS[bien.estado]} · Cant. ${bien.cantidad}`}
      trailing={trailing}
      trailingAccent={bien.valorEstimado != null}
      onPress={() => onPress(bien)}
      left={
        bien.fotoUri ? (
          <Image source={{ uri: bien.fotoUri }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbIcon}>📦</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: PremiumPalette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: { fontSize: 22 },
});
