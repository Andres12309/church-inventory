import { requireOptionalNativeModule } from 'expo';

import { useSpeechToTextFallback } from './useSpeechToTextFallback';

type SpeechHook = typeof useSpeechToTextFallback;

function resolveSpeechHook(): SpeechHook {
  const speechModule = requireOptionalNativeModule('ExpoSpeechRecognition');
  if (!speechModule) {
    return useSpeechToTextFallback;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./useSpeechToTextNative').useSpeechToTextNative as SpeechHook;
}

const useSpeechToTextImpl = resolveSpeechHook();

export function useSpeechToText(onTranscript: (text: string, isFinal: boolean) => void) {
  return useSpeechToTextImpl(onTranscript);
}

export function isSpeechRecognitionAvailable(): boolean {
  return requireOptionalNativeModule('ExpoSpeechRecognition') !== null;
}
