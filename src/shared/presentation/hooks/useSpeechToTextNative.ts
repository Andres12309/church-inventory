import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

const SPEECH_LANG = Platform.select({
  ios: 'es-EC',
  android: 'es-EC',
  default: 'es-ES',
}) ?? 'es-ES';

export function useSpeechToTextNative(onTranscript: (text: string, isFinal: boolean) => void) {
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSupported = useMemo(() => ExpoSpeechRecognitionModule.isRecognitionAvailable(), []);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setErrorMessage(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (transcript) {
      onTranscript(transcript, event.isFinal);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    setErrorMessage(event.message ?? 'No se pudo reconocer la voz');
  });

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage('Reconocimiento de voz no disponible en esta plataforma');
      return;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Se necesita permiso de micrófono para dictar');
      return;
    }

    setErrorMessage(null);
    ExpoSpeechRecognitionModule.start({
      lang: SPEECH_LANG,
      interimResults: true,
      continuous: false,
    });
  }, [isSupported]);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
      return;
    }

    await startListening();
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    errorMessage,
    toggleListening,
    stopListening,
  };
}
