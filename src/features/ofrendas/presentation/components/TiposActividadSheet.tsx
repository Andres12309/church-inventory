import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import { SocialPrimaryButton } from '@/shared/presentation/ui/socialUi';

import type { TipoActividad } from '../../domain/entities/TipoActividad';

type TiposActividadSheetProps = {
  visible: boolean;
  onClose: () => void;
  tipos: TipoActividad[];
  isSaving: boolean;
  onCrear: (nombre: string) => Promise<void>;
};

export function TiposActividadSheet({
  visible,
  onClose,
  tipos,
  isSaving,
  onCrear,
}: TiposActividadSheetProps) {
  const [nombre, setNombre] = useState('');

  const handleCrear = async () => {
    const trimmed = nombre.trim();
    if (!trimmed) {
      return;
    }
    await onCrear(trimmed);
    setNombre('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Tipos de actividad</Text>
          <Text style={styles.subtitle}>
            Catálogo compartido entre dispositivos y reportes Excel.
          </Text>

          <View style={styles.form}>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Colecta especial, Retiro..."
              placeholderTextColor={PremiumPalette.textMutedOnDark}
              style={styles.input}
              editable={!isSaving}
            />
            <SocialPrimaryButton
              label={isSaving ? 'Guardando…' : '+ Crear tipo'}
              loading={isSaving}
              onPress={() => void handleCrear()}
            />
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {tipos.map((tipo) => (
              <View key={tipo.id} style={styles.item}>
                <Text style={styles.itemNombre}>{tipo.nombre}</Text>
                <Text style={styles.itemCodigo}>{tipo.codigo}</Text>
              </View>
            ))}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>

          {isSaving ? (
            <ActivityIndicator style={styles.loader} color={PremiumPalette.primary} />
          ) : null}
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
    paddingBottom: 20,
    maxHeight: '85%',
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: PremiumPalette.surfaceMuted,
  },
  title: { color: PremiumPalette.textOnDark, fontSize: 18, fontWeight: '800' },
  subtitle: { color: PremiumPalette.textMutedOnDark, fontSize: 13, lineHeight: 18 },
  form: { gap: 10 },
  input: {
    backgroundColor: PremiumPalette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    color: PremiumPalette.textOnDark,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  list: { flexGrow: 0, maxHeight: 220 },
  listContent: { gap: 8, paddingBottom: 4 },
  item: {
    backgroundColor: PremiumPalette.canvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  itemNombre: { color: PremiumPalette.textOnDark, fontSize: 14, fontWeight: '700' },
  itemCodigo: { color: PremiumPalette.textMutedOnDark, fontSize: 11 },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: PremiumPalette.surfaceMuted,
  },
  closeText: { color: PremiumPalette.textSoftOnDark, fontSize: 14, fontWeight: '600' },
  loader: { marginTop: 4 },
});
