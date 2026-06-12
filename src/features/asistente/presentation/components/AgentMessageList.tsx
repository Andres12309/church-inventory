import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardChatScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';

import type { AgentMessage } from '../../domain/entities/AgentTypes';

type AgentMessageListProps = {
  messages: AgentMessage[];
  onSuggestionPress: (text: string) => void;
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

export function AgentMessageList({ messages, onSuggestionPress, bottomOffset = 0 }: AgentMessageListProps) {
  const router = useRouter();
  const scrollRef = useRef<React.ElementRef<typeof KeyboardChatScrollView>>(null);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timer);
  }, [messages]);

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

            {message.actions && message.actions.length > 0 ? (
              <View style={styles.actions}>
                {message.actions.map((action) => (
                  <Pressable
                    key={action.id}
                    onPress={() => router.push(action.href)}
                    style={({ pressed }) => [styles.actionChip, pressed && styles.pressed]}
                  >
                    <Text style={styles.actionIcon}>{action.icon}</Text>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {message.suggestions && message.suggestions.length > 0 ? (
              <View style={styles.suggestions}>
                {message.suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => onSuggestionPress(suggestion)}
                    style={({ pressed }) => [styles.suggestionChip, pressed && styles.pressed]}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </KeyboardChatScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  bubbleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleWrapUser: {
    justifyContent: 'flex-end',
  },
  bubbleWrapAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    fontSize: 22,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  bubbleUser: {
    backgroundColor: PremiumPalette.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: PremiumPalette.surface,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    borderBottomLeftRadius: 4,
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
  actions: {
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.25)',
  },
  actionIcon: { fontSize: 16 },
  actionLabel: {
    color: PremiumPalette.primary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: PremiumPalette.surfaceMuted,
  },
  suggestionText: {
    color: PremiumPalette.textSoftOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: { opacity: 0.85 },
});
