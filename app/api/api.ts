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
export async function fetchPhraseById(cardId: string): Promise<Phrase | null> {
  try {
    const response = await fetch(`http://localhost:7071/api/entity/Examples/${cardId}`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
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
export async function fetchCardCount(): Promise<number | null> {
  try {
    const response = await fetch(`http://localhost:7071/api/table/Examples/count`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
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
export async function fetchWordData(word: string, sentence: string): Promise<WordData> {
  // Remove punctuation from the end of the word (commas, periods, etc.)
  const cleanWord = word.replace(/[,\.!?;:—–-]+$/, '');
  
  try {
    const response = await fetch(`http://localhost:7071/api/russian/analyze-word`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
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
export async function searchExamples(query: string): Promise<Phrase[]> {
  try {
    const response = await fetch(`http://localhost:7071/api/search/Examples?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
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

export type { Phrase, WordData };
