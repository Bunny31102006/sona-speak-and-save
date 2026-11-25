# Sona Speak and Save — Fixed Mobile & Android APK Build Guide

## What Was Fixed
1. **Android Speech Synthesis ("This browser does not support speech synthesis")**:
   - Android `WebView` does not support the browser's `window.speechSynthesis` API.
   - Added a native Android `TextToSpeech` bridge in `android-bridge/MainActivity.java` (`window.AndroidTTS`) and updated `src/lib/speech/useSpeech.ts` to automatically use native Android voices inside the APK while keeping normal `window.speechSynthesis` working in Chrome, Edge, Safari, and Firefox.
2. **Working Translation**:
   - The original Translate button only showed a `"Translation needs setup"` dialog.
   - Added `src/lib/translate.ts` (Google Translate + MyMemory fallback, no API key needed), expanded the language list (English, Tamil, Hindi, Telugu, Malayalam, Kannada, Spanish, French, German, Japanese, Arabic, Chinese, Korean), added 1-click Undo, and auto-switches the TTS language filter when a matching voice is installed.
3. **Mobile View & App Icon**:
   - Added `viewport-fit=cover`, safe-area padding for Android status/navigation bars, sticky compact mobile header, full-width mobile Translate/Listen buttons, and no horizontal overflow.
   - Pre-generated all Android `mipmap-*` launcher icons from your `images.png` inside `android-icons/`.

---

## Step 1: Update Your Live Website (Vercel)
Push the updated files from this ZIP to the GitHub repo connected to `https://sona-speak-and-save.vercel.app/` (or run `vercel --prod`).
- As soon as Vercel finishes deploying (about 1 minute), **Translation** and **Mobile View** will work live on `https://sona-speak-and-save.vercel.app/` and the web app will be ready to talk to `window.AndroidTTS`.

---

## Step 2: Get Your Downloadable APK (Choose Either Method)

### Option A — Automatic Cloud Build on GitHub (No Android Studio Needed)
1. Push this entire folder to your GitHub repository (make sure `.github/workflows/build-apk.yml` is included).
2. Open your repository on GitHub → click the **Actions** tab → click **Build Android APK**.
3. Wait ~3 minutes for the green checkmark, then scroll to **Artifacts** and download **`Sona-Speak-and-Save-APK`** (`app-debug.apk`).
4. Share that `.apk` file with anyone — they can install and use voice + translation directly on Android!

### Option B — Build in Android Studio (2 Minutes)
1. Open your existing Capacitor Android project in Android Studio.
2. Copy `android-bridge/MainActivity.java` into:
   `android/app/src/main/java/com/sona/speakandsave/MainActivity.java` (replace the existing file).
3. Copy all `mipmap-*` folders from `android-icons/` into:
   `android/app/src/main/res/` (replace existing icons).
4. Click **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. Your fixed APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.
