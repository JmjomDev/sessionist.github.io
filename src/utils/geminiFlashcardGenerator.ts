import type { Flashcard } from '../types/study';

/**
 * Helper to convert File object to Base64 string for Gemini inline_data
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64Data);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Helper to extract plain text from text/json files
 */
export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        resolve(text);
      } else {
        resolve('');
      }
    };
    reader.onerror = () => reject(new Error('Failed to read uploaded file.'));
    reader.readAsText(file);
  });
}

/**
 * Intelligent Offline Flashcard Extractor
 * Automatically extracts definitions, key concepts, bullet points, and Q&As when AI rate limit is reached.
 */
export function generateOfflineFlashcards(topicTitle: string, rawText: string): Flashcard[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const flashcards: Flashcard[] = [];

  const addCard = (front: string, back: string) => {
    if (front.length > 3 && back.length > 2 && flashcards.length < 40) {
      flashcards.push({
        id: `fc-off-${Date.now()}-${flashcards.length}-${Math.random().toString(36).slice(2, 6)}`,
        front: front.replace(/^[-•*]\s*/, '').trim(),
        back: back.trim(),
        isPastMistake: false,
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern 1: Term : Definition or Term - Definition
    if (line.includes(':') || line.includes(' - ') || line.includes(' — ')) {
      const parts = line.split(/[:—]|\s-\s/);
      if (parts.length >= 2 && parts[0].length < 80 && parts[1].length > 3) {
        addCard(`What is ${parts[0].trim()}?`, parts.slice(1).join(':').trim());
        continue;
      }
    }

    // Pattern 2: Question ? Answer
    if (line.endsWith('?') && i + 1 < lines.length && !lines[i + 1].endsWith('?')) {
      addCard(line, lines[i + 1]);
      i++;
      continue;
    }

    // Pattern 3: Key concept / bullet point
    if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
      const clean = line.replace(/^[-•*]\s*/, '');
      if (clean.length > 15 && clean.length < 250) {
        addCard(`Key Concept in ${topicTitle}:`, clean);
      }
    }
  }

  // Fallback: Create structured study cards from text lines
  if (flashcards.length < 5 && lines.length > 0) {
    for (let j = 0; j < Math.min(lines.length, 30); j += 2) {
      const q = lines[j];
      const a = lines[j + 1] || lines[j];
      if (q && q.length > 10) {
        addCard(`Study Concept (${topicTitle}):`, `${q}${a && a !== q ? '\n' + a : ''}`);
      }
    }
  }

  return flashcards;
}

/**
 * Dynamically queries Google's ListModels endpoint to get live active endpoints valid for the user's API key.
 */
async function discoverActiveEndpoints(apiKey: string): Promise<string[]> {
  const discovered: string[] = [];

  for (const ver of ['v1beta', 'v1']) {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey.trim()}`;
      const res = await fetch(listUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          for (const m of data.models) {
            const methods: string[] = m.supportedGenerationMethods || [];
            if (methods.includes('generateContent')) {
              const modelId = String(m.name).replace('models/', '');
              // Prioritize flash & pro models
              const endpoint = `https://generativelanguage.googleapis.com/${ver}/models/${modelId}:generateContent`;
              if (modelId.includes('flash') || modelId.includes('pro')) {
                discovered.unshift(endpoint); // Put high-yield flash/pro models first
              } else {
                discovered.push(endpoint);
              }
            }
          }
        }
      }
    } catch {
      // ignore discovery failures
    }
  }

  // Static fallback list if discovery fails or returns empty
  const fallbackEndpoints = [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
  ];

  // Remove duplicates
  const finalEndpoints = Array.from(new Set([...discovered, ...fallbackEndpoints]));
  return finalEndpoints;
}

/**
 * Generates high-yield study flashcards using Google Gemini API with dynamic model discovery.
 */
export async function generateFlashcardsWithGemini(
  topicTitle: string,
  rawTextOrNotes: string,
  apiKey: string,
  file?: File | null
): Promise<Flashcard[]> {
  const cleanKey = apiKey ? apiKey.trim() : '';

  if (!cleanKey) {
    if (rawTextOrNotes && rawTextOrNotes.trim().length > 10) {
      return generateOfflineFlashcards(topicTitle, rawTextOrNotes);
    }
    throw new Error('Gemini API Key is missing. Please enter your free Gemini API Key in Settings.');
  }

  const promptText = `You are an academic and medical tutor modeled after Google's NotebookLM.
TASK: Generate 20-35 high-yield, testable study flashcards based on the lecture material for "${topicTitle}".

CRITICAL NOISE-FILTERING RULES:
1. IGNORE ADMINISTRATIVE SLIDES (grade breakdown, schedules, doctor names).
2. IGNORE TRIVIAL HISTORICAL FLUFF unless core tested concept.
3. EXAM-YIELD ONLY: Focus on medical concepts, biochemical mechanisms, diagnostic criteria, physiological processes, and key terminology.

FORMAT INSTRUCTIONS:
Return ONLY a raw JSON array of objects. Do not include markdown code blocks (\`\`\`json), intro text, or commentary.
Example:
[
  { "front": "What is the primary rate-limiting enzyme in glycolysis?", "back": "Phosphofructokinase-1 (PFK-1)" }
]

LECTURE NOTES FOR "${topicTitle}":
${rawTextOrNotes.slice(0, 100000)}`;

  let contentsPayload: any[];

  // Detect PDF files reliably across OS / WebView MIME types
  const isPdfFile = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

  if (isPdfFile) {
    const base64Pdf = await fileToBase64(file);
    contentsPayload = [
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: base64Pdf,
            },
          },
          { text: promptText },
        ],
      },
    ];
  } else {
    contentsPayload = [
      {
        role: 'user',
        parts: [{ text: promptText }],
      },
    ];
  }

  // Dynamic model discovery: Query Google ListModels in real-time for live supported endpoints!
  const requestEndpoints = await discoverActiveEndpoints(cleanKey);

  let response: Response | null = null;
  let lastErrorMessage = '';

  for (const endpointUrl of requestEndpoints) {
    try {
      const fullUrl = `${endpointUrl}?key=${cleanKey}`;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contentsPayload,
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      if (res.ok) {
        response = res;
        break;
      } else {
        const errorData = await res.json().catch(() => ({}));
        const rawErr = errorData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        lastErrorMessage = rawErr;
      }
    } catch (err: any) {
      lastErrorMessage = err?.message || 'Network request failed';
    }
  }

  // If Gemini API succeeded, parse AI response
  if (response && response.ok) {
    const data = await response.json();
    const rawResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (rawResponseText) {
      let jsonString = rawResponseText.trim();
      const jsonArrayMatch = jsonString.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonArrayMatch) {
        jsonString = jsonArrayMatch[0];
      } else {
        jsonString = jsonString.replace(/^```(?:json)?/gi, '').replace(/```$/gi, '').trim();
      }

      try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const flashcards: Flashcard[] = parsed
            .filter((item: any) => item && typeof item.front === 'string' && typeof item.back === 'string')
            .map((item: any, idx: number) => ({
              id: `fc-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              front: String(item.front).trim(),
              back: String(item.back).trim(),
              isPastMistake: false,
            }));

          if (flashcards.length > 0) {
            return flashcards;
          }
        }
      } catch {
        // fallthrough to offline generator if parse fails
      }
    }
  }

  // SMART FALLBACK: If API rate limited or failed, extract cards offline from lecture notes
  if (rawTextOrNotes && rawTextOrNotes.trim().length > 10) {
    const offlineCards = generateOfflineFlashcards(topicTitle, rawTextOrNotes);
    if (offlineCards.length > 0) {
      return offlineCards;
    }
  }

  if (lastErrorMessage.includes('API key not valid')) {
    throw new Error('Your Gemini API Key is invalid. Please check your key in Settings.');
  }

  throw new Error(lastErrorMessage || 'Gemini API request failed. Please check your API Key in Settings.');
}
