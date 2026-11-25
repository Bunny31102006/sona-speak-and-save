import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/sona/Header";
import { Editor, TRANSLATE_TARGETS } from "@/components/sona/Editor";
import { ALL_LANGS, ListeningPanel } from "@/components/sona/ListeningPanel";
import { SavedDrawer } from "@/components/sona/SavedDrawer";
import { InfoDialog, type InfoKind } from "@/components/sona/InfoDialog";
import { useDisplaySettings } from "@/lib/settings";
import { useSpeech, type SpeechSettings } from "@/lib/speech/useSpeech";
import { translateText } from "@/lib/translate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sona — Words in. Wonder out." },
      { name: "description", content: "Accessible text-to-speech using the voices on your device, with word highlighting, translation, and saved texts." },
      { property: "og:title", content: "Sona — Words in. Wonder out." },
      { property: "og:description", content: "Accessible text-to-speech with real device voices and instant translation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SonaPage,
});

const SAMPLE =
  "Learning is for everyone. When information is easier to hear and understand, we all have more opportunities to grow, participate, and belong. Sona helps you turn your text into clear speech — so knowledge can reach more people, in more places.";

function SonaPage() {
  const display = useDisplaySettings();
  const speech = useSpeech();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState(SAMPLE);
  const [lang, setLang] = useState(ALL_LANGS);
  const [target, setTarget] = useState("es");
  const [translating, setTranslating] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [info, setInfo] = useState<InfoKind>(null);
  const [voice, setVoice] = useState<SpeechSettings>({ voiceURI: null, rate: 1, pitch: 1, volume: 0.8 });

  // Pick a sensible default voice (browser/device default, else first) once voices arrive
  // or when the language filter excludes the current voice.
  useEffect(() => {
    const pool = lang === ALL_LANGS ? speech.voices : speech.voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
    if (pool.some((v) => v.voiceURI === voice.voiceURI)) return;
    const pick = pool.find((v) => v.default) ?? pool[0];
    setVoice((s) => ({ ...s, voiceURI: pick?.voiceURI ?? null }));
  }, [speech.voices, lang, voice.voiceURI]);

  const canPlay = speech.supported && (!!voice.voiceURI || speech.isAndroidNative) && text.trim().length > 0;

  const onPrimary = () => {
    if (speech.status === "speaking") speech.pause();
    else if (speech.status === "paused") speech.resume();
    else if (canPlay) speech.speak(text, voice);
  };

  // Settings changes while speaking restart from the current word so they apply immediately.
  const onSettings = (patch: Partial<SpeechSettings>, commit?: boolean) => {
    const next = { ...voice, ...patch };
    setVoice(next);
    if (commit && speech.status === "speaking") speech.speak(text, next, speech.word?.start ?? 0);
  };

  const onTranslate = async () => {
    if (!text.trim() || translating) return;
    speech.stop();
    setTranslating(true);
    const original = text;
    try {
      const translated = await translateText(text, target);
      if (!translated.trim()) throw new Error("Empty translation");
      setText(translated);

      // Auto-select matching TTS language if the device has a voice for it
      const baseCode = target.split("-")[0].toLowerCase();
      const hasVoiceForTarget = speech.voices.some((v) => v.lang.toLowerCase().startsWith(baseCode));
      if (hasVoiceForTarget) {
        setLang(baseCode);
      }

      const label = TRANSLATE_TARGETS.find(([v]) => v === target)?.[1] ?? target;
      toast.success(`Translated to ${label}`, {
        action: {
          label: "Undo",
          onClick: () => setText(original),
        },
      });
    } catch {
      toast.error("Translation failed. Check your internet connection and try again.");
    } finally {
      setTranslating(false);
    }
  };

  const progress =
    speech.status !== "idle" && speech.word && text.length
      ? Math.min(100, Math.round((speech.word.end / text.length) * 100))
      : null;

  const targetLabel = TRANSLATE_TARGETS.find(([v]) => v === target)?.[1] ?? target;

  return (
    <div className="min-h-dvh overflow-x-hidden safe-area-root">
      <Header
        settings={display.settings}
        onUpdate={display.update}
        onCreate={() => { setSavedOpen(false); speech.stop(); setTimeout(() => editorRef.current?.focus(), 0); }}
        onOpenSaved={() => setSavedOpen(true)}
        onOpenAbout={() => setInfo("about")}
      />
      <main className="mx-auto grid max-w-[1600px] lg:grid-cols-[3fr_2fr]">
        <div className="px-4 py-7 sm:px-8 sm:py-10 lg:py-16 xl:px-12">
          <Editor
            ref={editorRef}
            text={text}
            onChange={setText}
            reading={speech.status !== "idle"}
            word={speech.word}
            target={target}
            onTarget={setTarget}
            onTranslate={onTranslate}
            translating={translating}
          />
        </div>
        <div className="border-t border-border bg-panel px-4 py-7 sm:px-8 sm:py-10 lg:border-l lg:border-t-0 lg:py-16 xl:px-12">
          <ListeningPanel
            supported={speech.supported}
            isAndroidNative={speech.isAndroidNative}
            voicesLoaded={speech.voicesLoaded}
            voices={speech.voices}
            lang={lang}
            onLang={setLang}
            settings={voice}
            onSettings={onSettings}
            status={speech.status}
            canPlay={canPlay}
            progress={progress}
            error={speech.error}
            onPrimary={onPrimary}
            onStop={speech.stop}
          />
        </div>
      </main>

      <SavedDrawer
        open={savedOpen}
        onOpenChange={setSavedOpen}
        currentText={text}
        onOpenText={(t) => {
          speech.stop();
          setText(t.text);
          setSavedOpen(false);
          toast.success(`Opened “${t.name}”`);
        }}
      />
      <InfoDialog kind={info} target={targetLabel} onClose={() => setInfo(null)} />
    </div>
  );
}
