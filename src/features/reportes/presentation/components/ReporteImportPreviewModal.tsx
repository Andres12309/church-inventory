import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import { SocialPrimaryButton } from '@/shared/presentation/ui/socialUi';

import type { ReporteImportPreview } from '../../domain/entities/ReporteImportResult';
import { etiquetaAccionImportacion } from '../../domain/entities/ReporteImportResult';

type ReporteImportPreviewModalProps = {
  visible: boolean;
  preview: ReporteImportPreview | null;
  isApplying: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function StatChip({ label, value, accent }: { label: string; value: number; accent?: string }) {
  if (value === 0) {
    return null;
  }
  return (
    <View style={[styles.statChip, accent ? { borderColor: accent } : null]}>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function accionColor(accion: string): string {
  switch (accion) {
    case 'insertar':
      return PremiumPalette.accent;
    case 'actualizar':
      return PremiumPalette.primary;
    case 'error':
      return PremiumPalette.danger;
    case 'omitir_local_reciente':
      return PremiumPalette.textMutedOnDark;
    default:
      return PremiumPalette.textMutedOnDark;
  }
}

function accionIcono(tipo: 'bien' | 'ofrenda', accion: string): string {
  if (accion === 'error') {
    return '⚠️';
  }
  if (accion === 'fuera_alcance') {
    return '🚫';
  }
  if (accion === 'omitir_local_reciente') {
    return '⏭️';
  }
  return tipo === 'bien' ? '📦' : '💰';
}

export function ReporteImportPreviewModal({
  visible,
  preview,
  isApplying,
  onCancel,
  onConfirm,
}: ReporteImportPreviewModalProps) {
  if (!preview) {
    return null;
  }

  const totalFilas =
    preview.bienes.insertados +
    preview.bienes.actualizados +
    preview.bienes.omitidos +
    preview.bienes.fueraAlcance +
    preview.bienes.errores +
    preview.ofrendas.insertados +
    preview.ofrendas.actualizados +
    preview.ofrendas.omitidos +
    preview.ofrendas.fueraAlcance +
    preview.ofrendas.errores;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Vista previa de importación</Text>
          <Text style={styles.fileName} numberOfLines={2}>
            {preview.fileName}
          </Text>

          {preview.origenDispositivo || preview.origenAlcance ? (
            <Text style={styles.origen}>
              Origen: {preview.origenAlcance ?? '—'}
              {preview.origenDispositivo ? ` · ${preview.origenDispositivo}` : ''}
            </Text>
          ) : null}

          <View style={styles.statsRow}>
            <StatChip label="Nuevos" value={preview.bienes.insertados + preview.ofrendas.insertados} accent={PremiumPalette.accent} />
            <StatChip label="Actualizar" value={preview.bienes.actualizados + preview.ofrendas.actualizados} accent={PremiumPalette.primary} />
            <StatChip label="Omitir" value={preview.bienes.omitidos + preview.ofrendas.omitidos} />
            <StatChip label="Fuera alcance" value={preview.bienes.fueraAlcance + preview.ofrendas.fueraAlcance} />
            <StatChip label="Errores" value={preview.bienes.errores + preview.ofrendas.errores} accent={PremiumPalette.danger} />
          </View>

          <Text style={styles.sectionLabel}>
            Detalle ({totalFilas} filas analizadas · mostrando {preview.ejemplos.length})
          </Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {preview.ejemplos.map((item, index) => (
              <View key={`${item.tipo}-${item.titulo}-${index}`} style={styles.itemRow}>
                <Text style={styles.itemIcon}>{accionIcono(item.tipo, item.accion)}</Text>
                <View style={styles.itemBody}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.titulo}
                    </Text>
                    <Text style={[styles.itemBadge, { color: accionColor(item.accion) }]}>
                      {etiquetaAccionImportacion(item.accion)}
                    </Text>
                  </View>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {item.subtitulo}
                  </Text>
                  {item.detalle ? (
                    <Text style={styles.itemDetalle} numberOfLines={2}>
                      {item.detalle}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}

            {preview.mensajesError.length > preview.ejemplos.filter((e) => e.accion === 'error').length ? (
              <Text style={styles.moreErrors}>
                +{preview.mensajesError.length} advertencias adicionales no listadas
              </Text>
            ) : null}
          </ScrollView>

          {!preview.puedeAplicar ? (
            <Text style={styles.noApply}>
              No hay registros aplicables. Revisa el alcance de tu rol o el contenido del archivo.
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={isApplying}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed, isApplying && styles.disabled]}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <View style={styles.confirmWrap}>
              <SocialPrimaryButton
                label={
                  preview.puedeAplicar
                    ? `Aplicar ${preview.totalAplicable} cambio${preview.totalAplicable === 1 ? '' : 's'}`
                    : 'Sin cambios'
                }
                onPress={onConfirm}
                loading={isApplying}
                disabled={!preview.puedeAplicar || isApplying}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: PremiumPalette.canvas,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '88%',
    gap: 10,
  },
  title: {
    color: PremiumPalette.textOnDark,
    fontSize: 18,
    fontWeight: '700',
  },
  fileName: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
  },
  origen: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
    lineHeight: 17,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  statChip: {
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: 'center',
  },
  statValue: {
    color: PremiumPalette.textOnDark,
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 10,
    textAlign: 'center',
  },
  sectionLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  list: {
    maxHeight: 280,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PremiumPalette.surfaceMuted,
  },
  itemIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    color: PremiumPalette.textOnDark,
    fontSize: 14,
    fontWeight: '600',
  },
  itemBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
  },
  itemDetalle: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 11,
    lineHeight: 15,
  },
  moreErrors: {
    color: PremiumPalette.danger,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  noApply: {
    color: PremiumPalette.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  cancelText: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmWrap: {
    flex: 1,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
