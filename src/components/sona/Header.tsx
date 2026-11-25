import { AudioLines, Bookmark, ChevronDown, Moon, PersonStanding, Sun } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { DisplaySettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

interface Props {
  settings: DisplaySettings;
  onUpdate: (p: Partial<DisplaySettings>) => void;
  onCreate: () => void;
  onOpenSaved: () => void;
  onOpenAbout: () => void;
}

const iconBtn =
  "press grid size-10 sm:size-12 shrink-0 place-items-center rounded-full border border-border text-foreground hover:bg-accent";

export function Header({ settings, onUpdate, onCreate, onOpenSaved, onOpenAbout }: Props) {
  const toggles: { key: keyof DisplaySettings; label: string; hint: string }[] = [
    { key: "largeText", label: "Large text", hint: "Bigger type everywhere" },
    { key: "highContrast", label: "High contrast", hint: "Stronger colours and borders" },
    { key: "reduceMotion", label: "Reduce motion", hint: "Stops waveform and transitions" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-1.5 px-3 py-2.5 sm:gap-4 sm:px-8 sm:py-4">
        <a href="/" className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg pr-1 sm:min-h-12 sm:gap-2 sm:pr-2" aria-label="Sona home">
          <AudioLines className="size-6 text-primary sm:size-7" aria-hidden />
          <span className="text-xl font-medium tracking-tight sm:text-3xl">Sona</span>
        </a>

        <nav aria-label="Main" className="ml-1 flex items-center gap-1 sm:ml-6 sm:gap-3">
          <button
            onClick={onCreate}
            aria-current="page"
            className="press glow min-h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-105 sm:min-h-12 sm:px-8 sm:text-base"
          >
            Create
          </button>
          <button
            onClick={onOpenSaved}
            className="press flex min-h-10 items-center gap-2 rounded-full px-2.5 hover:bg-accent sm:min-h-12 sm:px-4"
          >
            <Bookmark className="size-5" aria-hidden />
            <span className="hidden sm:inline">Saved</span>
            <span className="sr-only sm:hidden">Saved</span>
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-4">
          <Popover>
            <PopoverTrigger className="press flex min-h-10 items-center gap-2 rounded-full hover:bg-accent sm:min-h-12 sm:pr-3">
              <span className="grid size-10 place-items-center rounded-full border border-border sm:size-12">
                <PersonStanding className="size-5" aria-hidden />
              </span>
              <span className="hidden text-sm md:inline">Accessibility</span>
              <span className="sr-only md:hidden">Accessibility settings</span>
              <ChevronDown className="hidden size-4 md:block" aria-hidden />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 rounded-2xl p-2 sm:w-80">
              <ul className="space-y-1">
                {toggles.map((t) => (
                  <li key={t.key}>
                    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2 hover:bg-accent">
                      <span>
                        <span className="block text-sm font-medium">{t.label}</span>
                        <span className="block text-xs text-muted-foreground">{t.hint}</span>
                      </span>
                      <Switch checked={settings[t.key]} onCheckedChange={(v) => onUpdate({ [t.key]: v })} />
                    </label>
                  </li>
                ))}
              </ul>
              <button
                onClick={onOpenAbout}
                className="press mt-1 min-h-12 w-full rounded-xl px-3 text-left text-sm text-primary hover:bg-accent"
              >
                About Sona
              </button>
            </PopoverContent>
          </Popover>

          <button
            className={iconBtn}
            onClick={() => onUpdate({ light: !settings.light })}
            aria-label={settings.light ? "Switch to dark theme" : "Switch to light theme"}
          >
            {settings.light ? <Moon className="size-5 text-primary" /> : <Sun className="size-5 text-primary" />}
          </button>
          <button
            className={cn(iconBtn, "text-base font-medium sm:text-lg", settings.largeText && "bg-accent")}
            onClick={() => onUpdate({ largeText: !settings.largeText })}
            aria-pressed={settings.largeText}
            aria-label="Large text"
          >
            Aa
          </button>
        </div>
      </div>
    </header>
  );
}
