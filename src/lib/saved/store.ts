/**
 * Saved texts. The UI talks only to the `SavedTextStore` interface so an
 * optional private cloud store (e.g. per-user table behind login) can be added
 * later without touching components. Today only the local store exists.
 */

export interface SavedText {
  id: string;
  name: string;
  text: string;
  updatedAt: number;
}

export interface SavedTextStore {
  readonly label: string;
  list(): SavedText[];
  save(item: Omit<SavedText, "id" | "updatedAt"> & { id?: string }): SavedText;
  remove(id: string): void;
}

const KEY = "sona.saved.v1";

export const localSavedStore: SavedTextStore = {
  label: "Saved on this device",
  list() {
    if (typeof window === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedText[];
      return Array.isArray(raw) ? raw.sort((a, b) => b.updatedAt - a.updatedAt) : [];
    } catch {
      return [];
    }
  },
  save(item) {
    const all = this.list();
    const saved: SavedText = {
      id: item.id ?? crypto.randomUUID(),
      name: item.name.trim() || "Untitled",
      text: item.text,
      updatedAt: Date.now(),
    };
    const next = [saved, ...all.filter((s) => s.id !== saved.id)];
    localStorage.setItem(KEY, JSON.stringify(next));
    return saved;
  },
  remove(id) {
    localStorage.setItem(KEY, JSON.stringify(this.list().filter((s) => s.id !== id)));
  },
};
