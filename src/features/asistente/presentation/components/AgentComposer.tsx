import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { isSpeechRecognitionAvailable } from '@/shared/presentation/hooks/useSpeechToText';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import { SocialVoiceInput } from '@/shared/presentation/ui/SocialVoiceInput';

type AgentComposerProps = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  bottomInset?: number;
  onLayoutHeight?: (height: number) => void;
};

export function AgentComposer({
  onSubmit,
  disabled = false,
  bottomInset = 0,
  onLayoutHeight,
}: AgentComposerProps) {
  const [draft, setDraft] = useState('');
  const speechAvailable = isSpeechRecognitionAvailable();

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || disabled) {
      return;
    }

    onSubmit(text);
    setDraft('');
  }, [disabled, draft, onSubmit]);

  const handleFinalTranscript = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || disabled) {
        return;
      }

      onSubmit(trimmed);
      setDraft('');
    },
    [disabled, onSubmit],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onLayoutHeight?.(event.nativeEvent.layout.height);
    },
    [onLayoutHeight],
  );

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
      <View
        style={[styles.container, { paddingBottom: Math.max(bottomInset, 8) }]}
        onLayout={handleLayout}
      >
        <Text style={styles.hint}>
          {speechAvailable
            ? 'Escribe o dicta tu pregunta · 🎙️ envía al soltar'
            : 'Escribe tu pregunta y pulsa ➤ para enviar'}
        </Text>

        <View style={styles.row}>
          <View style={styles.inputHost}>
            <SocialVoiceInput
              embedded
              value={draft}
              onChangeText={setDraft}
              onFinalTranscript={handleFinalTranscript}
              placeholder="Ej: ¿Dónde registro una ofrenda?"
              placeholderTextColor={PremiumPalette.textMutedOnDark}
              editable={!disabled}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              style={styles.textInput}
            />
          </View>

          <Pressable
            onPress={handleSend}
            disabled={disabled || draft.trim().length === 0}
            style={({ pressed }) => [
              styles.sendButton,
              (disabled || draft.trim().length === 0) && styles.sendDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Enviar pregunta"
          >
            <Text style={styles.sendIcon}>➤</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PremiumPalette.surfaceMuted,
    backgroundColor: PremiumPalette.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  hint: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 11,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputHost: {
    flex: 1,
    minHeight: 48,
    backgroundColor: PremiumPalette.canvas,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  textInput: {
    color: PremiumPalette.textOnDark,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minHeight: 40,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PremiumPalette.primary,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  pressed: { opacity: 0.85 },
});
