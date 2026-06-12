import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import { PillFilterRow, SocialPrimaryButton } from '@/shared/presentation/ui/socialUi';

import {
  FinanzaNaturaleza,
  etiquetaNaturalezaPlural,
  type FinanzaNaturalezaValue,
} from '../../domain/entities/FinanzaNaturaleza';
import type { TipoActividad } from '../../domain/entities/TipoActividad';

type TiposActividadSheetProps = {
  visible: boolean;
  onClose: () => void;
  tipos: TipoActividad[];
  isSaving: boolean;
  naturalezaInicial?: FinanzaNaturalezaValue;
  onCrear: (nombre: string, naturaleza: FinanzaNaturalezaValue) => Promise<void>;
};

const NATURALEZA_OPCIONES = [
  { id: FinanzaNaturaleza.INGRESO, label: 'Ingresos' },
  { id: FinanzaNaturaleza.EGRESO, label: 'Gastos' },
];

export function TiposActividadSheet({
  visible,
  onClose,
  tipos,
  isSaving,
  naturalezaInicial = FinanzaNaturaleza.INGRESO,
  onCrear,
}: TiposActividadSheetProps) {
  const insets = useSafeAreaInsets();
  const [naturalezaTab, setNaturalezaTab] = useState<FinanzaNaturalezaValue>(naturalezaInicial);
  const [nombre, setNombre] = useState('');
  const [ultimoCreado, setUltimoCreado] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNaturalezaTab(naturalezaInicial);
    }
  }, [visible, naturalezaInicial]);

  const tiposFiltrados = useMemo(
    () => tipos.filter((t) => t.naturaleza === naturalezaTab),
    [tipos, naturalezaTab],
  );

  const handleCrear = async () => {
    const trimmed = nombre.trim();
    if (trimmed.length < 2) {
      setErrorLocal('Escribe al menos 2 caracteres');
      return;
    }

    setErrorLocal(null);
    try {
      await onCrear(trimmed, naturalezaTab);
      setNombre('');
      setUltimoCreado(trimmed);
    } catch (error) {
      setErrorLocal(error instanceof Error ? error.message : 'No se pudo crear el tipo');
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: TipoActividad }) => {
      const esGasto = item.naturaleza === FinanzaNaturaleza.EGRESO;
      return (
        <View style={styles.item}>
          <View style={[styles.itemIcon, esGasto ? styles.itemIconGasto : styles.itemIconIngreso]}>
            <Text style={styles.itemIconText}>{esGasto ? '📤' : '📥'}</Text>
          </View>
          <View style={styles.itemCopy}>
            <Text style={styles.itemNombre}>{item.nombre}</Text>
            <Text style={styles.itemCodigo}>{item.codigo}</Text>
          </View>
        </View>
      );
    },
    [],
  );

  const placeholder =
    naturalezaTab === FinanzaNaturaleza.EGRESO
      ? 'Ej. Mantenimiento del templo'
      : 'Ej. Colecta misa dominical';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardHost}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.handle} />

            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Tipos de actividad</Text>
                <Text style={styles.subtitle}>
                  Clasifica ingresos y gastos · se sincroniza por P2P y Excel
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8} style={styles.closeIcon}>
                <Text style={styles.closeIconText}>✕</Text>
              </Pressable>
            </View>

            <PillFilterRow
              options={NATURALEZA_OPCIONES}
              selectedId={naturalezaTab}
              onSelect={(id) => id && setNaturalezaTab(id as FinanzaNaturalezaValue)}
            />

            <View style={styles.addSection}>
              <Text style={styles.sectionLabel}>
                Nuevo tipo de {etiquetaNaturalezaPlural(naturalezaTab).toLowerCase()}
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={nombre}
                  onChangeText={(text) => {
                    setNombre(text);
                    setErrorLocal(null);
                    setUltimoCreado(null);
                  }}
                  placeholder={placeholder}
                  placeholderTextColor={PremiumPalette.textMutedOnDark}
                  style={styles.input}
                  editable={!isSaving}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleCrear()}
                />
                <View style={styles.addBtnWrap}>
                  <SocialPrimaryButton
                    label={isSaving ? '…' : 'Agregar'}
                    loading={isSaving}
                    disabled={!nombre.trim() || isSaving}
                    onPress={() => void handleCrear()}
                  />
                </View>
              </View>
              {errorLocal ? <Text style={styles.error}>{errorLocal}</Text> : null}
              {ultimoCreado ? (
                <Text style={styles.success}>✓ «{ultimoCreado}» listo para usar</Text>
              ) : null}
            </View>

            <View style={styles.listHeader}>
              <Text style={styles.sectionLabel}>
                {etiquetaNaturalezaPlural(naturalezaTab)} activos
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{tiposFiltrados.length}</Text>
              </View>
            </View>

            <FlatList
              data={tiposFiltrados}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyTitle}>
                    Sin tipos de {etiquetaNaturalezaPlural(naturalezaTab).toLowerCase()}
                  </Text>
                  <Text style={styles.emptyMessage}>
                    Agrega el primero arriba para registrar movimientos clasificados.
                  </Text>
                </View>
              }
            />
          </Pressable>
        </KeyboardAvoidingView>
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
  keyboardHost: {
    maxHeight: '90%',
  },
  sheet: {
    backgroundColor: PremiumPalette.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '100%',
    height: '88%',
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: PremiumPalette.surfaceMuted,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: { flex: 1, gap: 4 },
  title: { color: PremiumPalette.textOnDark, fontSize: 18, fontWeight: '800' },
  subtitle: { color: PremiumPalette.textMutedOnDark, fontSize: 13, lineHeight: 18 },
  closeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PremiumPalette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconText: { color: PremiumPalette.textSoftOnDark, fontSize: 14, fontWeight: '700' },
  addSection: { gap: 8 },
  sectionLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  addBtnWrap: { minWidth: 108, flexShrink: 0 },
  input: {
    flex: 1,
    backgroundColor: PremiumPalette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    color: PremiumPalette.textOnDark,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  error: { color: PremiumPalette.danger, fontSize: 12 },
  success: { color: PremiumPalette.accent, fontSize: 12, fontWeight: '600' },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    backgroundColor: PremiumPalette.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: { color: PremiumPalette.primary, fontSize: 12, fontWeight: '800' },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: 8, paddingBottom: 8, flexGrow: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PremiumPalette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconIngreso: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  itemIconGasto: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  itemIconText: { fontSize: 16 },
  itemCopy: { flex: 1, gap: 2 },
  itemNombre: { color: PremiumPalette.textOnDark, fontSize: 14, fontWeight: '700' },
  itemCodigo: { color: PremiumPalette.textMutedOnDark, fontSize: 11 },
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyIcon: { fontSize: 28 },
  emptyTitle: { color: PremiumPalette.textOnDark, fontSize: 15, fontWeight: '700' },
  emptyMessage: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
