<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Speech playback lives in `src/lib/speech/useSpeech.ts` (browser speechSynthesis only); components never call speechSynthesis directly — keeps one source of truth for status/highlighting.
- Saved texts go through the `SavedTextStore` interface in `src/lib/saved/store.ts`; only a local store exists so a private cloud store can be added later without UI changes.
- Display/a11y preferences are `<html>` classes (theme-light, large-text, high-contrast, reduce-motion) defined in `src/styles.css` — tokens adapt in one place.
