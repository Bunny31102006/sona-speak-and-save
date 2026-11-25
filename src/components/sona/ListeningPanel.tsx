import { useMemo } from "react";
import { AudioWaveform, Globe, Mic, Pause, Play, Rabbit, Square, Turtle, Volume2, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import waveImg from "@/assets/coral-wave.jpg";
import type { SpeechSettings, SpeechStatus, SpeechVoiceItem } from "@/lib/speech/useSpeech";

export const ALL_LANGS = "all";

interface Props {
  supported: boolean;
  isAndroidNative?: boolean;
  voicesLoaded: boolean;
  voices: SpeechVoiceItem[];
  lang: string;
  onLang: (l: string) => void;
  settings: SpeechSettings;
  onSettings: (p: Partial<SpeechSettings>, commit?: boolean) => void;
  status: SpeechStatus;
  canPlay: boolean;
  progress: number | null;
  error: string | null;
  onPrimary: () => void;
  onStop: () => void;
}

const langName = (code: string) => {
  try {
    const n = new Intl.DisplayNames(undefined, { type: "language" }).of(code);
    return n ? `${n} (${code})` : code;
  } catch {
    return code;
  }
};

export function ListeningPanel(p: Props) {
  const { voices, lang, settings, status } = p;

  // Languages available from installed voices, grouped by base code.
  const langs = useMemo(
    () => [...new Set(voices.map((v) => v.lang.split(/[-_]/)[0].toLowerCase()))].sort(),
    [voices],
  );
  const filtered = lang === ALL_LANGS ? voices : voices.filter((v) => v.lang.toLowerCase().startsWith(lang));

  const noVoices = p.voicesLoaded && voices.length === 0;
  const primaryLabel = status === "speaking" ? "Pause" : status === "paused" ? "Resume" : "Listen now";
  const PrimaryIcon = status === "speaking" ? Pause : Play;

  return (
    <section aria-labelledby="preview-title" className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="preview-title" className="text-2xl font-medium sm:text-3xl">Listening preview</h2>
        {p.isAndroidNative && (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Android Native Voice
          </span>
        )}
      </div>
      <p className="mt-2 text-muted-foreground">Real voices installed on your device.</p>

      <div className="relative -mx-4 my-4 overflow-hidden sm:-mx-6" aria-hidden>
        <img
          src={waveImg}
          alt=""
          width={1536}
          height={1024}
          className={`mx-auto aspect-[3/2] w-full max-w-xl origin-center object-cover transition-opacity duration-500 ${
            status === "speaking" ? "wave-active" : "wave-idle"
          } ${status === "paused" ? "opacity-60" : ""}`}
        />
      </div>

      {!p.supported ? (
        <Notice>
          Speech synthesis is unavailable in this web view. Open this page in Chrome, Safari, Edge, or install the
          updated Sona Android APK with native voice support.
        </Notice>
      ) : noVoices ? (
        <Notice>
          No voices are installed on this device yet. Enable Google Speech Services in Android Settings → Accessibility
          → Text-to-speech output, then reopen the app.
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field id="voice" label="Voice">
          <Select
            value={settings.voiceURI ?? undefined}
            onValueChange={(v) => p.onSettings({ voiceURI: v }, true)}
            disabled={!filtered.length}
          >
            <SelectTrigger id="voice" className="h-12 w-full rounded-xl px-4 text-base">
              <span className="flex min-w-0 items-center gap-3">
                <Mic className="size-5 shrink-0" aria-hidden />
                <span className="truncate">
                  <SelectValue placeholder={p.voicesLoaded ? "No voice for this language" : "Loading voices…"} />
                </span>
              </span>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {filtered.map((v) => (
                <SelectItem key={v.voiceURI} value={v.voiceURI} className="min-h-11">
                  {v.name} <span className="text-muted-foreground">· {v.lang}{v.localService ? "" : " · online"}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="lang" label="Language (TTS)">
          <Select value={lang} onValueChange={p.onLang} disabled={!voices.length}>
            <SelectTrigger id="lang" className="h-12 w-full rounded-xl px-4 text-base">
              <span className="flex min-w-0 items-center gap-3">
                <Globe className="size-5 shrink-0" aria-hidden />
                <span className="truncate"><SelectValue /></span>
              </span>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL_LANGS} className="min-h-11">All installed languages</SelectItem>
              {langs.map((l) => (
                <SelectItem key={l} value={l} className="min-h-11">{langName(l)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <SliderField
          label="Speed" value={settings.rate} min={0.5} max={2} step={0.1}
          display={`${settings.rate.toFixed(1)}x`} Low={Turtle} High={Rabbit}
          onChange={(v, c) => p.onSettings({ rate: v }, c)}
        />
        <SliderField
          label="Pitch" value={settings.pitch} min={0.25} max={2} step={0.05}
          display={`${Math.round((settings.pitch - 1) * 100)}%`} Low={Activity} High={AudioWaveform}
          onChange={(v, c) => p.onSettings({ pitch: v }, c)}
        />
      </div>

      <button
        onClick={p.onPrimary}
        disabled={!p.canPlay && status === "idle"}
        className="press glow mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-primary text-lg font-medium text-primary-foreground hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:mt-8 sm:min-h-16 sm:gap-4 sm:text-xl"
      >
        <PrimaryIcon className="size-6 fill-current" aria-hidden />
        {primaryLabel}
      </button>
      {!p.canPlay && status === "idle" && p.supported && (
        <p className="mt-2 text-center text-sm text-muted-foreground">Add some text to listen.</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={p.onStop}
          disabled={status === "idle"}
          aria-label="Stop"
          className="press grid size-11 shrink-0 place-items-center rounded-full border border-border hover:bg-accent disabled:opacity-40 sm:size-12"
        >
          <Square className="size-4 fill-current" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <div
            role="progressbar"
            aria-label="Reading position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={p.progress ?? undefined}
            aria-valuetext={p.progress == null ? "Not playing" : `${p.progress}% of text read`}
            className="h-1.5 overflow-hidden rounded-full bg-secondary"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${p.progress ?? 0}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground" aria-live="polite">
            {status === "idle" ? "Ready" : status === "paused" ? "Paused" : "Speaking"}
            {p.progress != null && ` · ${p.progress}% of text`}
          </p>
        </div>
        <div className="flex w-24 shrink-0 items-center gap-2 sm:w-32">
          <Volume2 className="size-5 shrink-0" aria-hidden />
          <Slider
            aria-label="Volume"
            value={[settings.volume]} min={0} max={1} step={0.05}
            onValueChange={(vals) => p.onSettings({ volume: vals[0] ?? 0 })}
            onValueCommit={(vals) => p.onSettings({ volume: vals[0] ?? 0 }, true)}
            className="py-4"
          />
        </div>
      </div>
      {p.error && <p role="alert" className="mt-3 text-sm text-destructive">{p.error}</p>}
    </section>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SliderField(props: {
  label: string; value: number; min: number; max: number; step: number; display: string;
  Low: React.ComponentType<{ className?: string }>; High: React.ComponentType<{ className?: string }>;
  onChange: (v: number, commit: boolean) => void;
}) {
  const { Low, High } = props;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm text-muted-foreground">
        <span id={`${props.label}-l`}>{props.label}</span>
        <span aria-hidden>{props.display}</span>
      </div>
      <div className="flex items-center gap-3">
        <Low className="size-5 shrink-0" aria-hidden />
        <Slider
          aria-labelledby={`${props.label}-l`}
          aria-valuetext={props.display}
          value={[props.value]} min={props.min} max={props.max} step={props.step}
          onValueChange={(vals) => props.onChange(vals[0] ?? props.value, false)}
          onValueCommit={(vals) => props.onChange(vals[0] ?? props.value, true)}
          className="py-4"
        />
        <High className="size-5 shrink-0" aria-hidden />
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p role="status" className="mb-5 rounded-xl border border-primary/50 bg-primary/10 p-4 text-sm leading-relaxed">{children}</p>;
}
