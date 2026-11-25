/**
 * Client-side translation helper that works in mobile browsers and Android WebView APKs
 * without requiring a paid API key.
 * Uses Google Translate's public endpoint with automatic MyMemory API fallback.
 */

function splitForTranslation(text: string, maxLen = 450): string[] {
  const parts: string[] = [];
  const paragraphs = text.split(/(\n+)/);
  let current = "";

  for (const part of paragraphs) {
    if ((current + part).length <= maxLen) {
      current += part;
    } else {
      if (current) parts.push(current);
      if (part.length <= maxLen) {
        current = part;
      } else {
        // Split long paragraph on sentence or word boundaries
        let remaining = part;
        while (remaining.length > maxLen) {
          let cut = remaining.lastIndexOf(". ", maxLen);
          if (cut <= 0) cut = remaining.lastIndexOf(" ", maxLen);
          if (cut <= 0) cut = maxLen;
          else cut += 1;
          parts.push(remaining.slice(0, cut));
          remaining = remaining.slice(cut);
        }
        current = remaining;
      }
    }
  }
  if (current) parts.push(current);
  return parts;
}

async function translateChunkGoogle(chunk: string, targetLang: string): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(chunk)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translate HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("Unexpected translation format");
  }
  return data[0].map((seg: unknown[]) => (Array.isArray(seg) ? String(seg[0] ?? "") : "")).join("");
}

async function translateChunkMyMemory(chunk: string, targetLang: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=autodetect|${encodeURIComponent(targetLang)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (typeof translated !== "string" || !translated.trim()) {
    throw new Error("Empty MyMemory translation");
  }
  return translated;
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const chunks = splitForTranslation(trimmed, 450);
  const results: string[] = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) {
      results.push(chunk);
      continue;
    }
    try {
      results.push(await translateChunkGoogle(chunk, targetLang));
    } catch {
      results.push(await translateChunkMyMemory(chunk, targetLang));
    }
  }

  return results.join("");
}
