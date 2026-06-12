import { useCallback, useState } from 'react';

export function useSpeechToTextFallback(_onTranscript: (text: string, isFinal: boolean) => void) {
  const [errorMessage] = useState<string | null>(null);

  const toggleListening = useCallback(async () => {
    // Sin módulo nativo (p. ej. Expo Go): el micrófono no se muestra vía isSupported.
  }, []);

  const stopListening = useCallback(() => {}, []);

  return {
    isListening: false,
    isSupported: false,
    errorMessage,
    toggleListening,
    stopListening,
  };
}
