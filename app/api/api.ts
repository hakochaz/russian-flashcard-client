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
  englishTranslation: string;
  russianMeaning: string;
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
export async function fetchWordData(word: string, sentence: string, bearerToken?: string): Promise<WordData> {
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
        englishTranslation: "Translation not found",
        russianMeaning: "Meaning not found",
      };
    }
    
    const data = await response.json();
    return data as WordData;
  } catch (error) {
    console.error("Failed to fetch word data:", error);
    return {
      baseForm: word,
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

export type { Phrase, WordData };
