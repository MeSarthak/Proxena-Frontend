import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useSpeechDemo
 *
 * Wraps the browser's SpeechSynthesis API to play back text in a given
 * BCP-47 locale (e.g. 'en-US', 'en-GB').  Returns controls and state
 * so the caller can show a loading/speaking indicator and a stop button.
 *
 * Supported: Chrome, Edge, Safari, Firefox (all modern versions).
 * Falls back gracefully when SpeechSynthesis is unavailable.
 */
export function useSpeechDemo() {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cancel any in-progress speech when the component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string, lang: string) => {
    if (!window.speechSynthesis) return;

    // Cancel any current utterance first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;   // slightly slower — easier to follow
    utterance.pitch = 1.0;

    // Try to pick a voice that matches the locale
    const voices = window.speechSynthesis.getVoices();
    const match =
      voices.find((v) => v.lang === lang) ??
      voices.find((v) => v.lang.startsWith(lang.split('-')[0]));
    if (match) utterance.voice = match;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend   = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { speak, stop, speaking, supported };
}
