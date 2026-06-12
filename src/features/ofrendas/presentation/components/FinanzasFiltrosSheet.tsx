import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import {
  OrgScopeBanner,
  PillFilterRow,
  SocialPrimaryButton,
  type PillOption,
} from '@/shared/presentation/ui/socialUi';

import { formatearMonto } from '../store/ofrendasStore';

type FinanzasFiltrosSheetProps = {
  visible: boolean;
  onClose: () => void;
  fechaInicio: string;
  fechaFin: string;
  onFechaInicioChange: (value: string) => void;
  onFechaFinChange: (value: string) => void;
  orgOpciones: PillOption[];
  organizacionId: string | null;
  onOrganizacionChange: (id: string | null) => void;
  puedeElegirOrganizacion: boolean;
  orgLabel?: string;
  totalIngresos: number;
  totalEgresos: number;
  saldo: number;
  totalesPorTipo: { tipoActividadId: string; total: number }[];
  tiposMap: Record<string, { nombre: string; naturaleza?: string }>;
};

export function FinanzasFiltrosSheet({
  visible,
  onClose,
  fechaInicio,
  fechaFin,
  onFechaInicioChange,
  onFechaFinChange,
  orgOpciones,
  organizacionId,
  onOrganizacionChange,
  puedeElegirOrganizacion,
  orgLabel,
  totalIngresos,
  totalEgresos,
  saldo,
  totalesPorTipo,
  tiposMap,
}: FinanzasFiltrosSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Filtros y resumen</Text>

          {puedeElegirOrganizacion && orgOpciones.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.label}>Organización</Text>
              <PillFilterRow
                options={orgOpciones}
                selectedId={organizacionId}
                onSelect={onOrganizacionChange}
              />
            </View>
          ) : orgLabel ? (
            <OrgScopeBanner label="Organización activa" nombre={orgLabel} />
          ) : null}

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.label}>Desde</Text>
              <TextInput
                value={fechaInicio}
                onChangeText={onFechaInicioChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={PremiumPalette.textMutedOnDark}
                style={styles.input}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.label}>Hasta</Text>
              <TextInput
                value={fechaFin}
                onChangeText={onFechaFinChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={PremiumPalette.textMutedOnDark}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.resumenRow}>
            <View style={[styles.resumenCard, styles.ingresosCard]}>
              <Text style={styles.resumenLabel}>Ingresos</Text>
              <Text style={[styles.resumenValue, styles.ingresosValue]}>
                {formatearMonto(totalIngresos)}
              </Text>
            </View>
            <View style={[styles.resumenCard, styles.egresosCard]}>
              <Text style={styles.resumenLabel}>Gastos</Text>
              <Text style={[styles.resumenValue, styles.egresosValue]}>
                {formatearMonto(totalEgresos)}
              </Text>
            </View>
          </View>

          <View style={[styles.saldoCard, saldo < 0 && styles.saldoNegativo]}>
            <Text style={styles.saldoLabel}>Saldo del período</Text>
            <Text style={[styles.saldoValue, saldo < 0 && styles.saldoValueNegativo]}>
              {formatearMonto(saldo)}
            </Text>
          </View>

          {totalesPorTipo.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.label}>Desglose por actividad</Text>
              {totalesPorTipo.map((item) => (
                <View key={item.tipoActividadId} style={styles.desgloseRow}>
                  <Text style={styles.desgloseLabel}>
                    {tiposMap[item.tipoActividadId]?.nombre ?? 'Tipo'}
                  </Text>
                  <Text style={styles.desgloseValue}>{formatearMonto(item.total)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <SocialPrimaryButton label="Aplicar" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  sheet: {
    backgroundColor: PremiumPalette.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 14,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: PremiumPalette.surfaceMuted,
  },
  title: { color: PremiumPalette.textOnDark, fontSize: 18, fontWeight: '800' },
  section: { gap: 8 },
  label: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1, gap: 4 },
  input: {
    backgroundColor: PremiumPalette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    color: PremiumPalette.textOnDark,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resumenRow: { flexDirection: 'row', gap: 10 },
  resumenCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  ingresosCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: PremiumPalette.accent,
  },
  egresosCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: PremiumPalette.danger,
  },
  resumenLabel: { color: PremiumPalette.textMutedOnDark, fontSize: 11, fontWeight: '600' },
  resumenValue: { fontSize: 18, fontWeight: '900' },
  ingresosValue: { color: PremiumPalette.accent },
  egresosValue: { color: PremiumPalette.danger },
  saldoCard: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PremiumPalette.primary,
    padding: 14,
    gap: 4,
  },
  saldoNegativo: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: PremiumPalette.danger,
  },
  saldoLabel: { color: PremiumPalette.textMutedOnDark, fontSize: 12, fontWeight: '600' },
  saldoValue: { color: PremiumPalette.primary, fontSize: 24, fontWeight: '900' },
  saldoValueNegativo: { color: PremiumPalette.danger },
  desgloseRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  desgloseLabel: { color: PremiumPalette.textMutedOnDark, fontSize: 13, flex: 1 },
  desgloseValue: { color: PremiumPalette.textOnDark, fontSize: 13, fontWeight: '700' },
});
