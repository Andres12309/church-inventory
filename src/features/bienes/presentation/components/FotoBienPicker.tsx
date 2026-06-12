import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import { SocialFormField } from '@/shared/presentation/ui/socialUi';

type FotoBienPickerProps = {
  fotoUri: string | null;
  onChange: (uri: string | null) => void;
  onRemove: () => void;
  disabled?: boolean;
};

async function solicitarPermisos(): Promise<boolean> {
  const camara = await ImagePicker.requestCameraPermissionsAsync();
  const galeria = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return camara.granted || galeria.granted;
}

export function FotoBienPicker({
  fotoUri,
  onChange,
  onRemove,
  disabled = false,
}: FotoBienPickerProps) {
  const abrirCamara = async () => {
    if (disabled) {
      return;
    }

    const granted = await solicitarPermisos();
    if (!granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onChange(result.assets[0].uri);
    }
  };

  const abrirGaleria = async () => {
    if (disabled) {
      return;
    }

    const granted = await solicitarPermisos();
    if (!granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onChange(result.assets[0].uri);
    }
  };

  return (
    <SocialFormField label="Fotografía" hint="Opcional. Ayuda a identificar el bien en inventario.">
      <View style={styles.previewBox}>
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={styles.previewImage} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholderText}>Sin foto registrada</Text>
            <Text style={styles.placeholderHint}>Toca cámara o galería para agregar</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={abrirCamara}
          disabled={disabled}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed, disabled && styles.disabled]}
        >
          <Text style={styles.actionBtnText}>📸 Cámara</Text>
        </Pressable>

        <Pressable
          onPress={abrirGaleria}
          disabled={disabled}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed, disabled && styles.disabled]}
        >
          <Text style={styles.actionBtnText}>🖼️ Galería</Text>
        </Pressable>

        {fotoUri ? (
          <Pressable
            onPress={onRemove}
            disabled={disabled}
            style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
          >
            <Text style={styles.removeBtnText}>Quitar</Text>
          </Pressable>
        ) : null}
      </View>
    </SocialFormField>
  );
}

const styles = StyleSheet.create({
  previewBox: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: PremiumPalette.canvas,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', gap: 6, padding: 16 },
  placeholderIcon: { fontSize: 36 },
  placeholderText: { color: PremiumPalette.textSoftOnDark, fontSize: 14, fontWeight: '600' },
  placeholderHint: { color: PremiumPalette.textMutedOnDark, fontSize: 12, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionBtn: {
    backgroundColor: PremiumPalette.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  removeBtnText: { color: PremiumPalette.danger, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
});
