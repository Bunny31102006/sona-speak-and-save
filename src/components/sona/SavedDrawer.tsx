import { useEffect, useState } from "react";
import { HardDrive, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { localSavedStore, type SavedText, type SavedTextStore } from "@/lib/saved/store";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentText: string;
  onOpenText: (t: SavedText) => void;
  store?: SavedTextStore;
}

export function SavedDrawer({ open, onOpenChange, currentText, onOpenText, store = localSavedStore }: Props) {
  const [items, setItems] = useState<SavedText[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setItems(store.list());
  }, [open, store]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentText.trim()) return;
    store.save({ name, text: currentText });
    setName("");
    setItems(store.list());
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-2xl font-medium">Saved texts</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <HardDrive className="size-4" aria-hidden /> {store.label}. Clearing browser data removes them.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={save} className="mt-6 space-y-2">
          <label htmlFor="save-name" className="block text-sm text-muted-foreground">Name for the current text</label>
          <div className="flex gap-2">
            <input
              id="save-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lesson intro"
              className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-transparent px-4 placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!currentText.trim()}
              className="press min-h-12 rounded-xl bg-primary px-5 font-medium text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>

        <ul className="mt-6 flex-1 space-y-2 overflow-y-auto" aria-label="Saved texts">
          {items.length === 0 && <li className="py-8 text-center text-muted-foreground">Nothing saved yet.</li>}
          {items.map((it) => (
            <li key={it.id} className="flex items-stretch gap-2 rounded-xl border border-border">
              <button
                onClick={() => onOpenText(it)}
                className="press min-h-12 min-w-0 flex-1 rounded-xl px-4 py-3 text-left hover:bg-accent"
              >
                <span className="block truncate font-medium">{it.name}</span>
                <span className="block truncate text-sm text-muted-foreground">{it.text}</span>
              </button>
              <button
                onClick={() => { store.remove(it.id); setItems(store.list()); }}
                aria-label={`Delete ${it.name}`}
                className="press grid w-12 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-destructive"
              >
                <Trash2 className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
