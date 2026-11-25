import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type InfoKind = "about" | "translate" | null;

/** Honest notes: what the prototype is, and what still needs setup. */
export function InfoDialog({ kind, target, onClose }: { kind: InfoKind; target: string; onClose: () => void }) {
  return (
    <Dialog open={kind !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl">
        {kind === "translate" ? (
          <>
            <DialogHeader>
              <DialogTitle>Translation needs setup</DialogTitle>
              <DialogDescription>No translation service is connected, so nothing was translated.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Translating to <strong>{target}</strong> (and importing text from a source PDF) requires connecting a
                translation provider on a server. This prototype does not include one and will not show made-up results.
              </p>
              <p className="text-muted-foreground">
                You can still paste text already written in another language and pick a matching installed voice.
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>About Sona</DialogTitle>
              <DialogDescription>A browser-voice accessibility prototype.</DialogDescription>
            </DialogHeader>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
              <li>Speech uses your browser's built-in voices (Web Speech API). It is not a trained Tacotron or WaveNet model.</li>
              <li>Available languages and voice quality depend on the voices installed on your device and browser. Some voices may need an internet connection.</li>
              <li>Browser speech can't be exported, so there is no audio download.</li>
              <li>Word highlighting appears only where the voice reports word boundaries; otherwise the current sentence is highlighted.</li>
              <li>Saved texts stay on this device. No sign-in is required.</li>
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
