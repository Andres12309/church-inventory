import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth } from '@/constants/theme';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import { SocialHeader } from '@/shared/presentation/ui/socialUi';

import { AgentComposer } from '../components/AgentComposer';
import { AgentMessageList } from '../components/AgentMessageList';
import { useAgentAssistant } from '../hooks/useAgentAssistant';

export function AsistenteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { messages, submitQuery, selectOption, composer, isProcessing, context } =
    useAgentAssistant();
  const [composerHeight, setComposerHeight] = useState(0);

  const chatBottomOffset = composerHeight + insets.bottom;

  const handleComposerLayout = useCallback((height: number) => {
    setComposerHeight(height);
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.headerWrap}>
          <SocialHeader
            title="Asistente Fieles"
            subtitle="Chat guiado · elige opciones y responde paso a paso"
            badge="Modo conversación"
            onBack={() => router.back()}
          />
        </View>

        <View style={styles.chatHost}>
          <AgentMessageList
            messages={messages}
            onOptionPress={(option) => selectOption(option.id, option.label)}
            isProcessing={isProcessing}
            bottomOffset={chatBottomOffset}
          />
        </View>

        <AgentComposer
          onSubmit={submitQuery}
          disabled={!context || !composer.enabled || isProcessing}
          placeholder={composer.placeholder}
          bottomInset={insets.bottom}
          onLayoutHeight={handleComposerLayout}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PremiumPalette.canvas,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  chatHost: {
    flex: 1,
  },
});
