import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardChatScrollView } from 'react-native-keyboard-controller';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';

import type { AgentFlowOption, AgentMessage } from '../../domain/entities/AgentTypes';

type AgentMessageListProps = {
  messages: AgentMessage[];
  onOptionPress: (option: AgentFlowOption) => void;
  isProcessing?: boolean;
  bottomOffset?: number;
};

function renderBoldSegments(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={`${part}-${index}`} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

export function AgentMessageList({
  messages,
  onOptionPress,
  isProcessing = false,
  bottomOffset = 0,
}: AgentMessageListProps) {
  const scrollRef = useRef<React.ElementRef<typeof KeyboardChatScrollView>>(null);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timer);
  }, [messages, isProcessing]);

  return (
    <KeyboardChatScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.list}
      offset={bottomOffset}
      keyboardLiftBehavior="always"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {messages.map((message) => (
        <View
          key={message.id}
          style={[
            styles.bubbleWrap,
            message.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAssistant,
          ]}
        >
          {message.role === 'assistant' ? <Text style={styles.avatar}>🤖</Text> : null}

          <View
            style={[
              styles.messageColumn,
              message.role === 'user' ? styles.messageColumnUser : styles.messageColumnAssistant,
            ]}
          >
            <View
              style={[
                styles.bubble,
                message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  message.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                ]}
              >
                {renderBoldSegments(message.text)}
              </Text>
            </View>

            {message.role === 'assistant' && message.options && message.options.length > 0 ? (
              <View style={styles.optionsList}>
                {message.options.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => onOptionPress(option)}
                    disabled={isProcessing}
                    style={({ pressed }) => [
                      styles.optionButton,
                      isProcessing && styles.optionDisabled,
                      pressed && !isProcessing && styles.pressed,
                    ]}
                  >
                    {option.icon ? (
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                    ) : null}
                    <Text style={styles.optionLabel}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ))}

      {isProcessing ? (
        <View style={styles.typingRow}>
          <Text style={styles.avatar}>🤖</Text>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={PremiumPalette.primary} />
            <Text style={styles.typingText}>Un momento…</Text>
          </View>
        </View>
      ) : null}
    </KeyboardChatScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 14,
  },
  bubbleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bubbleWrapUser: {
    justifyContent: 'flex-end',
  },
  bubbleWrapAssistant: {
    justifyContent: 'flex-start',
  },
  messageColumn: {
    maxWidth: '86%',
    gap: 6,
  },
  messageColumnUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageColumnAssistant: {
    alignSelf: 'flex-start',
    alignItems: 'stretch',
  },
  avatar: {
    fontSize: 22,
    marginTop: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: PremiumPalette.primary,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  bubbleAssistant: {
    backgroundColor: PremiumPalette.surface,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTextAssistant: {
    color: PremiumPalette.textOnDark,
  },
  bold: {
    fontWeight: '800',
  },
  optionsList: {
    gap: 6,
    alignSelf: 'stretch',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PremiumPalette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.45)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionIcon: {
    fontSize: 16,
  },
  optionLabel: {
    color: PremiumPalette.primary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PremiumPalette.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
  },
  typingText: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.88,
  },
});
