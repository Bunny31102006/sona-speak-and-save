import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Unified speech synthesis hook supporting:
 * 1. Native Android TTS bridge (`window.AndroidTTS`) inside the Capacitor APK WebView
 * 2. Standard browser Web Speech API (`window.speechSynthesis`) on Chrome, Edge, Safari, Firefox
 */

export type SpeechStatus = "idle" | "speaking" | "paused";

export interface SpeechSettings {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
}

export interface WordRange {
  start: number;
  end: number;
}

export interface SpeechVoiceItem {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
  default: boolean;
}

interface AndroidTTSBridge {
  isAvailable(): boolean;
  getVoicesJson(): string;
  speak(
    text: string,
    voiceURI: string,
    lang: string,
    rate: number,
    pitch: number,
    volume: number,
    utteranceId: string,
  ): void;
  stop(): void;
  openTtsSettings?(): void;
}

declare global {
  interface Window {
    AndroidTTS?: AndroidTTSBridge;
    __androidTtsReady?: () => void;
    __androidTtsEvent?: (
      event: "start" | "done" | "error" | "range",
      utteranceId: string,
      arg1?: string | number,
      arg2?: number,
    ) => void;
  }
}

interface Chunk {
  text: string;
  offset: number;
}

/** Split into sentence-ish chunks, keeping absolute offsets. */
export function chunkText(text: string, max = 220): Chunk[] {
  const chunks: Chunk[] = [];
  const re = /[^.!?\n]+[.!?]*[\s]*|\n+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let piece = m[0];
    let offset = m.index;
    while (piece.length > max) {
      const cut = piece.lastIndexOf(" ", max) > 0 ? piece.lastIndexOf(" ", max) : max;
      chunks.push({ text: piece.slice(0, cut), offset });
      piece = piece.slice(cut);
      offset += cut;
    }
    if (piece.trim()) chunks.push({ text: piece, offset });
  }
  return chunks;
}

function getAndroidBridge(): AndroidTTSBridge | null {
  if (typeof window !== "undefined" && window.AndroidTTS) {
    return window.AndroidTTS;
  }
  return null;
}

function parseAndroidVoices(bridge: AndroidTTSBridge): SpeechVoiceItem[] {
  try {
    const raw = bridge.getVoicesJson();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v) => v && typeof v.voiceURI === "string")
      .map((v) => ({
        name: String(v.name || v.voiceURI),
        lang: String(v.lang || "en-US"),
        voiceURI: String(v.voiceURI),
        localService: Boolean(v.localService ?? true),
        default: Boolean(v.default ?? false),
      }));
  } catch {
    return [];
  }
}

export function useSpeech() {
  const [isAndroidNative, setIsAndroidNative] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechVoiceItem[]>([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [word, setWord] = useState<WordRange | null>(null);
  const [boundarySeen, setBoundarySeen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runRef = useRef(0);
  // Used for Android native pause/resume & chunk queue management
  const activeStateRef = useRef<{
    text: string;
    settings: SpeechSettings;
    chunks: Chunk[];
    chunkIndex: number;
    currentOffset: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const bridge = getAndroidBridge();
    if (bridge) {
      setIsAndroidNative(true);
      setSupported(true);

      const loadAndroidVoices = () => {
        if (!bridge.isAvailable()) return false;
        const list = parseAndroidVoices(bridge);
        if (list.length > 0) {
          setVoices(list);
          setVoicesLoaded(true);
          return true;
        }
        return false;
      };

      window.__androidTtsReady = () => {
        loadAndroidVoices();
        setVoicesLoaded(true);
      };

      if (!loadAndroidVoices()) {
        // Poll briefly in case Android TTS engine finishes initializing right after page load
        const poll = window.setInterval(() => {
          if (loadAndroidVoices()) {
            window.clearInterval(poll);
          }
        }, 400);
        const timeout = window.setTimeout(() => {
          window.clearInterval(poll);
          loadAndroidVoices();
          setVoicesLoaded(true);
        }, 4000);
        return () => {
          window.clearInterval(poll);
          window.clearTimeout(timeout);
          bridge.stop();
        };
      }

      return () => {
        bridge.stop();
      };
    }

    // Standard browser Web Speech API
    const hasWebSpeech = "speechSynthesis" in window;
    setSupported(hasWebSpeech);
    if (!hasWebSpeech) {
      setVoicesLoaded(true);
      return;
    }

    const synth = window.speechSynthesis;
    const load = () => {
      const list = synth.getVoices().map((v) => ({
        name: v.name,
        lang: v.lang,
        voiceURI: v.voiceURI,
        localService: v.localService,
        default: v.default,
      }));
      setVoices(list);
      if (list.length) setVoicesLoaded(true);
    };
    load();
    synth.addEventListener("voiceschanged", load);
    const t = window.setTimeout(() => setVoicesLoaded(true), 2500);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      window.clearTimeout(t);
      synth.cancel();
    };
  }, []);

  const speakAndroidChunk = useCallback(
    (run: number, chunkIndex: number) => {
      const bridge = getAndroidBridge();
      const state = activeStateRef.current;
      if (!bridge || !state || run !== runRef.current) return;

      if (chunkIndex >= state.chunks.length) {
        setStatus("idle");
        setWord(null);
        activeStateRef.current = null;
        return;
      }

      state.chunkIndex = chunkIndex;
      const chunk = state.chunks[chunkIndex];
      state.currentOffset = chunk.offset;

      const selectedVoice = voices.find((v) => v.voiceURI === state.settings.voiceURI) ?? null;
      const utteranceId = `${run}:${chunkIndex}`;

      window.__androidTtsEvent = (event, id, arg1, arg2) => {
        if (run !== runRef.current || id !== utteranceId) return;

        if (event === "start") {
          setStatus("speaking");
          setWord({ start: chunk.offset, end: chunk.offset + chunk.text.trimEnd().length });
        } else if (event === "range") {
          const start = Number(arg1 ?? 0);
          const end = Number(arg2 ?? start + 1);
          setBoundarySeen(true);
          state.currentOffset = chunk.offset + start;
          setWord({ start: chunk.offset + start, end: chunk.offset + end });
        } else if (event === "done") {
          speakAndroidChunk(run, chunkIndex + 1);
        } else if (event === "error") {
          setError(`Playback stopped: ${String(arg1 || "TTS error")}`);
          setStatus("idle");
          setWord(null);
          activeStateRef.current = null;
        }
      };

      bridge.speak(
        chunk.text,
        selectedVoice?.voiceURI ?? "",
        selectedVoice?.lang ?? "en-US",
        state.settings.rate,
        state.settings.pitch,
        state.settings.volume,
        utteranceId,
      );
    },
    [voices],
  );

  const stop = useCallback(() => {
    runRef.current++;
    activeStateRef.current = null;
    const bridge = getAndroidBridge();
    if (bridge) {
      bridge.stop();
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setStatus("idle");
    setWord(null);
  }, []);

  /** Speak `text` starting at character `from`. */
  const speak = useCallback(
    (text: string, settings: SpeechSettings, from = 0) => {
      if (!supported) return;
      const run = ++runRef.current;
      setError(null);

      const chunks = chunkText(text.slice(from)).map((c) => ({ ...c, offset: c.offset + from }));
      if (!chunks.length) return;

      const bridge = getAndroidBridge();
      if (bridge) {
        bridge.stop();
        activeStateRef.current = {
          text,
          settings,
          chunks,
          chunkIndex: 0,
          currentOffset: chunks[0].offset,
        };
        setStatus("speaking");
        speakAndroidChunk(run, 0);
        return;
      }

      // Standard browser Web Speech API
      const synth = window.speechSynthesis;
      synth.cancel();

      const browserVoices = synth.getVoices();
      const voice = browserVoices.find((v) => v.voiceURI === settings.voiceURI) ?? null;

      chunks.forEach((chunk, i) => {
        const u = new SpeechSynthesisUtterance(chunk.text);
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        }
        u.rate = settings.rate;
        u.pitch = settings.pitch;
        u.volume = settings.volume;
        u.onstart = () => {
          if (run !== runRef.current) return;
          setStatus("speaking");
          setWord({ start: chunk.offset, end: chunk.offset + chunk.text.trimEnd().length });
        };
        u.onboundary = (e) => {
          if (run !== runRef.current || e.name === "sentence") return;
          setBoundarySeen(true);
          const start = chunk.offset + e.charIndex;
          const len = e.charLength || (/^\S+/.exec(chunk.text.slice(e.charIndex))?.[0].length ?? 1);
          setWord({ start, end: start + len });
        };
        u.onend = () => {
          if (run !== runRef.current) return;
          if (i === chunks.length - 1) {
            setStatus("idle");
            setWord(null);
          }
        };
        u.onerror = (e) => {
          if (run !== runRef.current) return;
          if (e.error === "interrupted" || e.error === "canceled") return;
          setError(`Playback stopped: ${e.error}`);
          setStatus("idle");
          setWord(null);
        };
        synth.speak(u);
      });
      setStatus("speaking");
    },
    [supported, speakAndroidChunk],
  );

  const pause = useCallback(() => {
    if (!supported) return;
    const bridge = getAndroidBridge();
    if (bridge) {
      // Android TextToSpeech has no native pause, so we stop and remember the exact offset
      runRef.current++;
      bridge.stop();
      setStatus("paused");
      return;
    }
    window.speechSynthesis.pause();
    setStatus("paused");
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    const bridge = getAndroidBridge();
    if (bridge) {
      const state = activeStateRef.current;
      if (state) {
        speak(state.text, state.settings, state.currentOffset);
      } else {
        setStatus("idle");
      }
      return;
    }
    window.speechSynthesis.resume();
    setStatus("speaking");
  }, [supported, speak]);

  return {
    supported,
    isAndroidNative,
    voices,
    voicesLoaded,
    status,
    word,
    boundarySeen,
    error,
    speak,
    pause,
    resume,
    stop,
  };
}
