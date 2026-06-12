import { useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInputProps,
  View,
} from "react-native";

import { PremiumPalette } from "@/shared/presentation/ui/premiumPalette";

import { useSpeechToText } from "../hooks/useSpeechToText";
import { SocialInput, SocialTextArea } from "./socialUi";

type SocialVoiceInputProps = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  embedded?: boolean;
  /** Se invoca tras un dictado final con el texto ya fusionado al valor actual. */
  onFinalTranscript?: (text: string) => void;
};

export function SocialVoiceInput({
  value,
  onChangeText,
  editable = true,
  multiline = false,
  embedded = false,
  onFinalTranscript,
  ...props
}: SocialVoiceInputProps) {
  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal) {
        const merged =
          value.trim().length > 0 ? `${value.trim()} ${text}` : text;
        onChangeText(merged);
        onFinalTranscript?.(merged);
        return;
      }

      onChangeText(text);
    },
    [onChangeText, onFinalTranscript, value],
  );

  const { isListening, isSupported, errorMessage, toggleListening } =
    useSpeechToText(handleTranscript);

  const canDictate = editable && isSupported;
  const InputComponent = multiline ? SocialTextArea : SocialInput;

  return (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      <View style={[styles.row, multiline && styles.rowMultiline]}>
        <InputComponent
          {...props}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          style={[styles.input, embedded && styles.inputEmbedded, props.style]}
        />

        {canDictate ? (
          <Pressable
            onPress={() => void toggleListening()}
            accessibilityRole="button"
            accessibilityLabel={
              isListening ? "Detener dictado" : "Dictar con voz"
            }
            style={({ pressed }) => [
              styles.micButton,
              multiline && styles.micButtonMultiline,
              isListening && styles.micButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.micIcon}>{isListening ? "⏹" : "🎙️"}</Text>
          </Pressable>
        ) : null}
      </View>

      {isListening ? (
        <Text style={styles.listeningHint}>
          Escuchando… toca ⏹ para detener
        </Text>
      ) : null}

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  containerEmbedded: { flex: 1, gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowMultiline: {
    alignItems: "flex-start",
  },
  input: { flex: 1 },
  inputEmbedded: {
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PremiumPalette.surfaceMuted,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
  },
  micButtonMultiline: {
    marginTop: 4,
  },
  micButtonActive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: PremiumPalette.danger,
  },
  micIcon: { fontSize: 18 },
  listeningHint: {
    color: PremiumPalette.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    color: PremiumPalette.danger,
    fontSize: 12,
  },
  pressed: { opacity: 0.85 },
});

type SocialVoiceSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SocialVoiceSearchBar({
  value,
  onChangeText,
  placeholder = "Buscar…",
}: SocialVoiceSearchBarProps) {
  return (
    <View style={searchStyles.wrap}>
      <Text style={searchStyles.icon}>🔍</Text>
      <SocialVoiceInput
        embedded
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={PremiumPalette.textMutedOnDark}
      />
    </View>
  );
}

const searchStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PremiumPalette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    paddingHorizontal: 12,
  },
  icon: { fontSize: 16 },
});
