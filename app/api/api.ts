import { apiBaseUrl } from "../auth/authConfig";

interface Phrase {
  CardId: string;
  Phrase: string;
  PhraseStress: string;
  Audio: string;
  Translation: string;
}

interface WordData {
  baseForm: string;
  baseFormStress: string;
  englishTranslation: string;
  russianMeaning: string;
}

interface ForvoSearchResult {
  phrase: string;
  audio: string;
}

interface Pronunciation {
  audioMp3: string;
  sex: string;
  username: string;
  country: string;
}

interface ShadowingEntity {
  entity: {
    Sentence: string;
  };
  pronunciations: Pronunciation[];
}

interface ShadowingCreateResponse {
  partitionKey: string;
  rowKey: string;
  sentence: string;
}

interface MinimalPairsEntity {
  entity: {
    Pair: string;
  };
  pronunciations1: Pronunciation[];
  pronunciations2: Pronunciation[];
}

interface MinimalPairsCreateResponse {
  partitionKey: string;
  rowKey: string;
  pair: string;
}

// Utility function to sort pronunciations by country (Russia first) and gender (Male first)
export function sortPronunciations(pronunciations: Pronunciation[]): Pronunciation[] {
  return [...pronunciations].sort((a, b) => {
    // First, prioritize Russia country
    const aIsRussia = a.country === "Russia" ? 1 : 0;
    const bIsRussia = b.country === "Russia" ? 1 : 0;
    
    if (aIsRussia !== bIsRussia) {
      return bIsRussia - aIsRussia; // Russia first (higher value first)
    }
    
    // Then, within same country, prioritize Male gender
    const aIsMale = a.sex === "m" ? 1 : 0;
    const bIsMale = b.sex === "m" ? 1 : 0;
    
    return bIsMale - aIsMale; // Male first (higher value first)
  });
}

// API function to search Forvo for a phrase
export async function searchForvoPhrase(phrase: string, bearerToken?: string): Promise<ForvoSearchResult[]> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/forvo/search/${encodeURIComponent(phrase)}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to search Forvo:", error);
    return [];
  }
}

// API function to fetch pronunciations for a word (exact match)
export async function fetchForvoPronunciations(word: string, bearerToken?: string): Promise<Pronunciation[]> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/forvo/pronunciations/${encodeURIComponent(word)}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch pronunciations:", error);
    return [];
  }
}

// API function to fetch phrase by ID
export async function fetchPhraseById(cardId: string, bearerToken?: string): Promise<Phrase | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/entity/Examples/${cardId}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data as Phrase;
  } catch (error) {
    console.error("Failed to fetch phrase:", error);
    return null;
  }
}

// API function to fetch total card count
export async function fetchCardCount(bearerToken?: string): Promise<number | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/table/Examples/count`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.rowCount as number;
  } catch (error) {
    console.error("Failed to fetch card count:", error);
    return null;
  }
}

// API function to fetch word analysis data
export async function fetchWordData(word: string, sentence: string, bearerToken?: string, fetchStress: boolean = true): Promise<WordData> {
  // Remove punctuation from the end of the word (commas, periods, etc.)
  const cleanWord = word.replace(/[,\.!?;:—–-]+$/, '');
  
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/russian/analyze-word`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers,
      body: JSON.stringify({
        sentence: sentence,
        word: cleanWord,
      }),
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return {
        baseForm: word,
        baseFormStress: word,
        englishTranslation: "Translation not found",
        russianMeaning: "Meaning not found",
      };
    }
    
    const data = await response.json() as WordData;
    
    // Get stressed version of the base form if requested
    let stressedBaseForm = data.baseForm;
    if (fetchStress) {
      stressedBaseForm = await getStressedWord(data.baseForm, bearerToken) || data.baseForm;
    }
    
    return {
      ...data,
      baseFormStress: stressedBaseForm,
    };
  } catch (error) {
    console.error("Failed to fetch word data:", error);
    return {
      baseForm: word,
      baseFormStress: word,
      englishTranslation: "Translation not found",
      russianMeaning: "Meaning not found",
    };
  }
}

// API function to search for examples
export async function searchExamples(query: string, bearerToken?: string): Promise<Phrase[]> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/search/Examples?q=${encodeURIComponent(query)}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to search:", error);
    return [];
  }
}

// API function to fetch word variations
export async function fetchWordVariations(word: string, bearerToken?: string): Promise<string[]> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/russian/variations?word=${encodeURIComponent(word)}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch word variations:", error);
    return [];
  }
}

// API function to synthesize audio for a sentence
export async function synthesizeSentenceAudio(sentence: string, bearerToken?: string): Promise<string | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/russian/synthesize`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers,
      body: JSON.stringify({ sentence }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error("Failed to synthesize audio:", error);
    return null;
  }
}

// API function to get sentence with stress marks
export async function getStressedSentence(sentence: string, bearerToken?: string): Promise<string | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/russian/stress`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers,
      body: JSON.stringify({ sentence }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.stressed || null;
  } catch (error) {
    console.error("Failed to get stressed sentence:", error);
    return null;
  }
}

// API function to get word with stress marks
export async function getStressedWord(word: string, bearerToken?: string): Promise<string | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/russian/stress`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers,
      body: JSON.stringify({ sentence: word }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.stressed || null;
  } catch (error) {
    console.error("Failed to get stressed word:", error);
    return null;
  }
}

// API function to get phrase base form
export async function fetchPhraseBaseForm(sentence: string, words: string, bearerToken?: string): Promise<{ phraseAnswer: string; bracketedSentence: string; baseForm: string } | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/russian/phrase-base-form`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers,
      body: JSON.stringify({ sentence, words }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch phrase base form:", error);
    return null;
  }
}

// API function to fetch shadowing entity by ID
export async function fetchShadowingById(rowKey: string, bearerToken?: string): Promise<ShadowingEntity | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/shadowing/${encodeURIComponent(rowKey)}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data as ShadowingEntity;
  } catch (error) {
    console.error("Failed to fetch shadowing entity:", error);
    return null;
  }
}

// API function to fetch total shadowing count
export async function fetchShadowingCount(bearerToken?: string): Promise<number | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/table/shadowing/count`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.rowCount as number;
  } catch (error) {
    console.error("Failed to fetch shadowing count:", error);
    return null;
  }
}

// API function to add a new shadowing entry
export async function addShadowingEntry(
  sentence: string,
  difficulty: 'easy' | 'medium' | 'hard',
  bearerToken?: string
): Promise<ShadowingCreateResponse | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/shadowing/add`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers,
      body: JSON.stringify({ sentence, difficulty }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data as ShadowingCreateResponse;
  } catch (error) {
    console.error("Failed to add shadowing entry:", error);
    return null;
  }
}

// API function to fetch minimal pairs entity by ID
export async function fetchMinimalPairById(rowKey: string, bearerToken?: string): Promise<MinimalPairsEntity | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/minimalpairs/${encodeURIComponent(rowKey)}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data as MinimalPairsEntity;
  } catch (error) {
    console.error("Failed to fetch minimal pairs entity:", error);
    return null;
  }
}

// API function to fetch total minimal pairs count
export async function fetchMinimalPairsCount(bearerToken?: string): Promise<number | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/table/minimalpairs/count`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers,
    });
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.rowCount as number;
  } catch (error) {
    console.error("Failed to fetch minimal pairs count:", error);
    return null;
  }
}

// API function to add a new minimal pairs entry
export async function addMinimalPairEntry(
  pair: string,
  difficulty: 'easy' | 'medium' | 'hard',
  bearerToken?: string
): Promise<MinimalPairsCreateResponse | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, "")}/api/minimalpairs/add`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers,
      body: JSON.stringify({ pair, difficulty }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data as MinimalPairsCreateResponse;
  } catch (error) {
    console.error("Failed to add minimal pair entry:", error);
    return null;
  }
}

export type {
  Phrase,
  WordData,
  ForvoSearchResult,
  Pronunciation,
  ShadowingEntity,
  ShadowingCreateResponse,
  MinimalPairsEntity,
  MinimalPairsCreateResponse,
};
