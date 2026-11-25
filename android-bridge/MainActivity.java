package com.sona.speakandsave;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Capacitor MainActivity with a built-in native Android TextToSpeech bridge.
 * Fixes "This browser does not support speech synthesis" inside Android WebView
 * with zero external Capacitor plugins required.
 */
public class MainActivity extends BridgeActivity implements TextToSpeech.OnInitListener {

    private TextToSpeech tts;
    private volatile boolean ttsReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Match Sona dark navy background to avoid white flash on startup
        if (getWindow() != null) {
            getWindow().setStatusBarColor(Color.parseColor("#091523"));
            getWindow().setNavigationBarColor(Color.parseColor("#091523"));
        }

        // Initialize Android's built-in TextToSpeech engine
        tts = new TextToSpeech(this, this);

        // Attach the JavaScript bridge to Capacitor's WebView
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.setBackgroundColor(Color.parseColor("#091523"));
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            webView.addJavascriptInterface(new AndroidTTSInterface(), "AndroidTTS");
        }
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            ttsReady = true;
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {
                    emitJsEvent("start", utteranceId, null, null);
                }

                @Override
                public void onDone(String utteranceId) {
                    emitJsEvent("done", utteranceId, null, null);
                }

                @Override
                @Deprecated
                public void onError(String utteranceId) {
                    emitJsEvent("error", utteranceId, "speech_error", null);
                }

                @Override
                public void onError(String utteranceId, int errorCode) {
                    emitJsEvent("error", utteranceId, "code_" + errorCode, null);
                }

                @Override
                public void onRangeStart(String utteranceId, int start, int end, int frame) {
                    emitJsEvent("range", utteranceId, String.valueOf(start), String.valueOf(end));
                }
            });

            runOnUiThread(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                            "window.__androidTtsReady && window.__androidTtsReady();",
                            null
                    );
                }
            });
        } else {
            ttsReady = false;
        }
    }

    private void emitJsEvent(String event, String utteranceId, String arg1, String arg2) {
        final String safeId = JSONObject.quote(utteranceId != null ? utteranceId : "");
        final String js;
        if ("range".equals(event) && arg1 != null && arg2 != null) {
            js = "window.__androidTtsEvent && window.__androidTtsEvent('range', " + safeId + ", " + arg1 + ", " + arg2 + ");";
        } else if (arg1 != null) {
            js = "window.__androidTtsEvent && window.__androidTtsEvent(" + JSONObject.quote(event) + ", " + safeId + ", " + JSONObject.quote(arg1) + ");";
        } else {
            js = "window.__androidTtsEvent && window.__androidTtsEvent(" + JSONObject.quote(event) + ", " + safeId + ");";
        }

        runOnUiThread(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        });
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        super.onDestroy();
    }

    private class AndroidTTSInterface {

        @JavascriptInterface
        public boolean isAvailable() {
            return ttsReady && tts != null;
        }

        @JavascriptInterface
        public String getVoicesJson() {
            JSONArray array = new JSONArray();
            if (!ttsReady || tts == null) {
                return array.toString();
            }

            try {
                Voice defaultVoice = tts.getDefaultVoice();
                String defaultName = defaultVoice != null ? defaultVoice.getName() : "";

                Set<Voice> voiceSet = tts.getVoices();
                if (voiceSet != null && !voiceSet.isEmpty()) {
                    List<Voice> sorted = new ArrayList<>(voiceSet);
                    Collections.sort(sorted, new Comparator<Voice>() {
                        @Override
                        public int compare(Voice a, Voice b) {
                            boolean aDef = a.getName().equals(defaultName);
                            boolean bDef = b.getName().equals(defaultName);
                            if (aDef != bDef) return aDef ? -1 : 1;
                            String aLang = a.getLocale() != null ? a.getLocale().toLanguageTag() : "";
                            String bLang = b.getLocale() != null ? b.getLocale().toLanguageTag() : "";
                            int cmp = aLang.compareToIgnoreCase(bLang);
                            if (cmp != 0) return cmp;
                            return a.getName().compareToIgnoreCase(b.getName());
                        }
                    });

                    for (Voice v : sorted) {
                        if (v == null || v.getLocale() == null) continue;
                        // Skip voices explicitly marked as unavailable/not installed
                        if (v.getFeatures() != null && v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) {
                            continue;
                        }
                        Locale loc = v.getLocale();
                        String tag = loc.toLanguageTag();
                        String display = loc.getDisplayLanguage()
                                + (loc.getDisplayCountry().isEmpty() ? "" : " (" + loc.getDisplayCountry() + ")");
                        String shortId = v.getName();
                        if (shortId.length() > 14) {
                            shortId = shortId.substring(shortId.length() - 10);
                        }

                        JSONObject obj = new JSONObject();
                        obj.put("name", display + " · " + shortId);
                        obj.put("lang", tag);
                        obj.put("voiceURI", v.getName());
                        obj.put("localService", !v.isNetworkConnectionRequired());
                        obj.put("default", v.getName().equals(defaultName));
                        array.put(obj);
                    }
                }

                // Fallback entry if engine exposes default locale but empty getVoices()
                if (array.length() == 0) {
                    Locale loc = Locale.getDefault();
                    JSONObject obj = new JSONObject();
                    obj.put("name", "Android Default (" + loc.getDisplayLanguage() + ")");
                    obj.put("lang", loc.toLanguageTag());
                    obj.put("voiceURI", "android-default");
                    obj.put("localService", true);
                    obj.put("default", true);
                    array.put(obj);
                }
            } catch (Exception ignored) {
            }

            return array.toString();
        }

        @JavascriptInterface
        public void speak(String text, String voiceURI, String lang, float rate, float pitch, float volume, String utteranceId) {
            if (!ttsReady || tts == null || text == null || text.trim().isEmpty()) {
                emitJsEvent("error", utteranceId, "tts_not_ready", null);
                return;
            }

            runOnUiThread(() -> {
                try {
                    if (tts == null) return;

                    boolean voiceApplied = false;
                    if (voiceURI != null && !voiceURI.isEmpty() && !"android-default".equals(voiceURI)) {
                        Set<Voice> voices = tts.getVoices();
                        if (voices != null) {
                            for (Voice v : voices) {
                                if (voiceURI.equals(v.getName())) {
                                    tts.setVoice(v);
                                    voiceApplied = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (!voiceApplied && lang != null && !lang.isEmpty()) {
                        Locale locale = Locale.forLanguageTag(lang);
                        tts.setLanguage(locale);
                    }

                    tts.setSpeechRate(Math.max(0.25f, Math.min(2.5f, rate)));
                    tts.setPitch(Math.max(0.25f, Math.min(2.0f, pitch)));

                    Bundle params = new Bundle();
                    params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, Math.max(0f, Math.min(1f, volume)));
                    params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId);

                    int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId);
                    if (result != TextToSpeech.SUCCESS) {
                        emitJsEvent("error", utteranceId, "speak_failed", null);
                    }
                } catch (Exception e) {
                    emitJsEvent("error", utteranceId, e.getMessage(), null);
                }
            });
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(() -> {
                if (tts != null) {
                    tts.stop();
                }
            });
        }

        @JavascriptInterface
        public void openTtsSettings() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent("com.android.settings.TTS_SETTINGS");
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception ignored) {
                }
            });
        }
    }
}
