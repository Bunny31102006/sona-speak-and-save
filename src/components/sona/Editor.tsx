import { forwardRef } from "react";
import { Globe, Languages, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WordRange } from "@/lib/speech/useSpeech";

export const MAX_CHARS = 5000;

export const TRANSLATE_TARGETS = [
  ["en", "English (en)"],
  ["ta", "Tamil (ta)"],
  ["hi", "Hindi (hi)"],
  ["te", "Telugu (te)"],
  ["ml", "Malayalam (ml)"],
  ["kn", "Kannada (kn)"],
  ["es", "Spanish (es)"],
  ["fr", "French (fr)"],
  ["de", "German (de)"],
  ["ja", "Japanese (ja)"],
  ["ar", "Arabic (ar)"],
  ["zh-CN", "Chinese (zh)"],
  ["ko", "Korean (ko)"],
] as const;

interface Props {
  text: string;
  onChange: (t: string) => void;
  /** When set, text is shown read-only with the spoken word highlighted. */
  reading: boolean;
  word: WordRange | null;
  target: string;
  onTarget: (v: string) => void;
  onTranslate: () => void;
  translating?: boolean;
}

export const Editor = forwardRef<HTMLTextAreaElement, Props>(function Editor(
  { text, onChange, reading, word, target, onTarget, onTranslate, translating = false },
  ref,
) {
  const textCls = "min-h-[200px] sm:min-h-[260px] w-full px-4 pb-6 text-base leading-[1.75] sm:px-8 sm:pb-8 sm:text-xl sm:leading-[1.8]";

  return (
    <section aria-labelledby="hero-title" className="flex flex-col">
      <p className="eyebrow">Text to speech + translation</p>
      <h1 id="hero-title" className="mt-3 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] sm:mt-5 sm:text-6xl xl:text-7xl">
        Words in. <span className="text-primary">Wonder out.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-xl">
        Turn your ideas into clear speech with the voices on your device.
        For clearer communication and more accessible learning.
      </p>

      <div className="relative mt-6 rounded-2xl border border-border bg-card transition-shadow focus-within:border-primary/70 sm:mt-8">
        <div className="flex items-center justify-between px-4 pt-4 text-sm text-muted-foreground sm:px-8 sm:pt-5">
          <label htmlFor="sona-text" className="font-medium">
            Your text
          </label>
          <span aria-live="polite" className={text.length >= MAX_CHARS ? "text-destructive" : undefined}>
            {text.length} / {MAX_CHARS}
          </span>
        </div>

        {reading ? (
          // Read-only view while speaking so the highlighted word stays in sync.
          <div className={`${textCls} pt-3 whitespace-pre-wrap sm:pt-4`} aria-label="Text being read">
            {word ? (
              <>
                {text.slice(0, word.start)}
                <mark className="rounded bg-highlight px-0.5 text-foreground">{text.slice(word.start, word.end)}</mark>
                {text.slice(word.end)}
              </>
            ) : (
              text
            )}
          </div>
        ) : (
          <textarea
            id="sona-text"
            ref={ref}
            value={text}
            maxLength={MAX_CHARS}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type or paste the text you want to hear…"
            className={`${textCls} block resize-y bg-transparent pt-3 outline-none placeholder:text-muted-foreground focus-visible:outline-none sm:pt-4`}
          />
        )}
        {reading && (
          <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-8">Stop playback to edit the text.</p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label id="translate-label" className="mb-2 block text-sm text-muted-foreground">
            Translate to
          </label>
          <Select value={target} onValueChange={onTarget} disabled={translating || reading}>
            <SelectTrigger aria-labelledby="translate-label" className="h-12 w-full rounded-xl px-4 text-base">
              <span className="flex min-w-0 items-center gap-3">
                <Globe className="size-5 shrink-0" aria-hidden />
                <span className="truncate"><SelectValue /></span>
              </span>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {TRANSLATE_TARGETS.map(([v, l]) => (
                <SelectItem key={v} value={v} className="min-h-11">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={onTranslate}
          disabled={translating || reading || !text.trim()}
          className="press flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-primary px-6 font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {translating ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Languages className="size-5" aria-hidden />
          )}
          {translating ? "Translating…" : "Translate"}
        </button>
      </div>
    </section>
  );
});
