import type { Route } from "./+types/all-sentences";
import { Container, Title, Text, Button, Paper, Group, Stack, CopyButton, ActionIcon, Tooltip, TextInput } from "@mantine/core";
import { useState, useEffect } from "react";

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
async function fetchPhraseById(cardId: string): Promise<Phrase | null> {
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
async function fetchCardCount(): Promise<number | null> {
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

interface FlashcardProps {
  phrase: Phrase;
  selectedWord: string;
  wordData: WordData | null;
  isLoading: boolean;
  onBack: () => void;
}

function Flashcard({ phrase, selectedWord, wordData, isLoading, onBack }: FlashcardProps) {
  return (
    <Paper p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Button
            variant="subtle"
            onClick={onBack}
          >
            ← Back to Sentence
          </Button>
          <Text fw={600} c="dimmed">
            Selected word: "{selectedWord}"
          </Text>
        </Group>

        {isLoading ? (
          <Text>Loading word data...</Text>
        ) : wordData ? (
          <Stack gap="sm">
            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Base Form:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="center">
                  <Text fw={500}>{wordData.baseForm}</Text>
                  <CopyButton value={wordData.baseForm}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                        <ActionIcon
                          color={copied ? "teal" : "gray"}
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? "✓" : "📋"}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Paper>
            </div>

            <div>
              <Text size="sm" c="dimmed" mb="xs">
                English Translation:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="center">
                  <Text fw={500}>{wordData.englishTranslation}</Text>
                  <CopyButton value={wordData.englishTranslation}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                        <ActionIcon
                          color={copied ? "teal" : "gray"}
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? "✓" : "📋"}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Paper>
            </div>

            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Russian Meaning:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="flex-start">
                  <Text fw={500} style={{ flex: 1 }}>{wordData.russianMeaning}</Text>
                  <CopyButton value={wordData.russianMeaning}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                        <ActionIcon
                          color={copied ? "teal" : "gray"}
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? "✓" : "📋"}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Paper>
            </div>

            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Phrase:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="center">
                  <Text fw={500}>{phrase.Phrase}</Text>
                  <CopyButton value={phrase.Phrase}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                        <ActionIcon
                          color={copied ? "teal" : "gray"}
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? "✓" : "📋"}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Paper>
            </div>

            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Phrase with stress marks:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="center">
                  <Text fw={500}>{phrase.PhraseStress}</Text>
                  <CopyButton value={phrase.PhraseStress}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                        <ActionIcon
                          color={copied ? "teal" : "gray"}
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? "✓" : "📋"}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Paper>
            </div>

            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Audio:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="center" wrap="nowrap">
                  <audio controls style={{ flex: 1 }}>
                    <source src={phrase.Audio} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <CopyButton value={phrase.Audio}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                        <ActionIcon
                          color={copied ? "teal" : "gray"}
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? "✓" : "📋"}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Paper>
            </div>
          </Stack>
        ) : (
          <Text c="red">Failed to load word data</Text>
        )}
      </Stack>
    </Paper>
  );
}

interface SentenceCardProps {
  phrase: Phrase;
  onSelectWords: (words: string[]) => void;
  selectedWords: string[];
}

function SentenceCard({ phrase, onSelectWords, selectedWords }: SentenceCardProps) {
  const words = phrase.Phrase.split(/\s+/);

  const toggleWord = (word: string) => {
    setLocalSelectedWords(prev =>
      prev.includes(word)
        ? prev.filter(w => w !== word)
        : [...prev, word]
    );
  };

  const [localSelectedWords, setLocalSelectedWords] = useState<string[]>([]);

  return (
    <Paper p="lg" radius="md" withBorder>
      <Stack gap="md">
        <div>
          <Text size="sm" c="dimmed" mb="md">
            Click on words to select them, then confirm:
          </Text>
          <Paper p="md" bg="gray.0" radius="sm" style={{ lineHeight: 1.8, minHeight: "80px", display: "flex", alignItems: "center" }}>
            <Group gap="xs" wrap="wrap">
              {words.map((word, index) => (
                <Button
                  key={index}
                  variant={localSelectedWords.includes(word) ? "filled" : "light"}
                  size="sm"
                  onClick={() => toggleWord(word)}
                  style={{ cursor: "pointer" }}
                >
                  {word}
                </Button>
              ))}
            </Group>
          </Paper>
        </div>

        {localSelectedWords.length > 0 && (
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setLocalSelectedWords([])}>
              Clear Selection
            </Button>
            <Button onClick={() => onSelectWords(localSelectedWords)}>
              Create Flashcards ({localSelectedWords.length})
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}

// API function to fetch word analysis data
async function fetchWordData(word: string, sentence: string): Promise<WordData> {
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

export function meta({}: Route.MetaArgs) {
  return [{ title: "All Sentences" }];
}

export default function AllSentences() {
  const [currentCardId, setCurrentCardId] = useState("1");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [selectedWordDataList, setSelectedWordDataList] = useState<WordData[]>([]);
  const [currentSelectedWordIndex, setCurrentSelectedWordIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [phraseLoading, setPhraseLoading] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState<Phrase | null>(null);
  const [totalCards, setTotalCards] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goToCardInput, setGoToCardInput] = useState("");
  const [creatingFlashcards, setCreatingFlashcards] = useState(false);

  // Load total card count on mount
  useEffect(() => {
    const loadCardCount = async () => {
      const count = await fetchCardCount();
      setTotalCards(count);
    };

    loadCardCount();
  }, []);

  // Load phrase when currentCardId changes
  useEffect(() => {
    const loadPhrase = async () => {
      setPhraseLoading(true);
      setError(null);
      const phrase = await fetchPhraseById(currentCardId);
      if (phrase) {
        setCurrentPhrase(phrase);
      } else {
        setError("Card not found");
        setCurrentPhrase(null);
      }
      setPhraseLoading(false);
    };

    loadPhrase();
  }, [currentCardId]);

  const handleSelectWords = async (words: string[]) => {
    setSelectedWords(words);
    setCurrentSelectedWordIndex(0);
    setCreatingFlashcards(true);
    
    try {
      if (currentPhrase) {
        const dataList = await Promise.all(
          words.map(word => fetchWordData(word, currentPhrase.Phrase))
        );
        setSelectedWordDataList(dataList);
      }
    } catch (error) {
      console.error("Failed to fetch word data:", error);
      setSelectedWordDataList([]);
    } finally {
      setCreatingFlashcards(false);
    }
  };

  const handleBackToSentence = () => {
    setSelectedWords([]);
    setSelectedWordDataList([]);
    setCurrentSelectedWordIndex(0);
  };

  const handlePreviousWord = () => {
    if (currentSelectedWordIndex > 0) {
      setCurrentSelectedWordIndex(prev => prev - 1);
    }
  };

  const handleNextWord = () => {
    if (currentSelectedWordIndex < selectedWords.length - 1) {
      setCurrentSelectedWordIndex(prev => prev + 1);
    }
  };

  const isAtFirstWord = currentSelectedWordIndex === 0;
  const isAtLastWord = currentSelectedWordIndex === selectedWords.length - 1;

  const handlePrevious = () => {
    const prevId = parseInt(currentCardId) - 1;
    if (prevId >= 1) {
      setCurrentCardId(String(prevId));
    }
  };

  const handleNext = () => {
    if (!isAtLastCard) {
      const nextId = parseInt(currentCardId) + 1;
      setCurrentCardId(String(nextId));
    }
  };

  const isAtFirstCard = currentCardId === "1";
  const isAtLastCard = totalCards !== null && parseInt(currentCardId) === totalCards;

  const handleGoToCard = () => {
    const cardId = goToCardInput.trim();
    if (cardId && /^\d+$/.test(cardId)) {
      const cardNum = parseInt(cardId);
      if (totalCards === null || (cardNum >= 1 && cardNum <= totalCards)) {
        setCurrentCardId(cardId);
        setGoToCardInput("");
      }
    }
  };

  return (
    <Container size="md" className="pt-16 pb-16">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>All Sentences</Title>
            <Text mt="sm" c="dimmed">
              Select a word from the sentence to create a flashcard
            </Text>
          </div>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              placeholder="Card No"
              value={goToCardInput}
              onChange={(e) => setGoToCardInput(e.currentTarget.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleGoToCard();
                }
              }}
              size="sm"
              w={80}
            />
            <Button onClick={handleGoToCard} variant="light" size="sm">
              Go
            </Button>
          </Group>
        </Group>

        {phraseLoading ? (
          <Paper p="lg" radius="md" withBorder>
            <Text>Loading card...</Text>
          </Paper>
        ) : error ? (
          <Paper p="lg" radius="md" withBorder>
            <Text c="red">{error}</Text>
          </Paper>
        ) : currentPhrase ? (
          <>
            {selectedWords.length > 0 ? (
              <>
                {creatingFlashcards ? (
                  <Paper p="lg" radius="md" withBorder>
                    <Text>Creating flashcards...</Text>
                  </Paper>
                ) : selectedWordDataList.length > 0 ? (
                  <>
                    <Flashcard
                      phrase={currentPhrase}
                      selectedWord={selectedWords[currentSelectedWordIndex]}
                      wordData={selectedWordDataList[currentSelectedWordIndex]}
                      isLoading={false}
                      onBack={handleBackToSentence}
                    />

                    <Group justify="space-between" mt="xl">
                      <Button
                        variant="subtle"
                        onClick={handlePreviousWord}
                        disabled={isAtFirstWord}
                      >
                        Previous
                      </Button>
                      <Text c="dimmed">
                        {currentSelectedWordIndex + 1} / {selectedWords.length}
                      </Text>
                      <Button
                        variant="subtle"
                        onClick={handleNextWord}
                        disabled={isAtLastWord}
                      >
                        Next
                      </Button>
                    </Group>
                  </>
                ) : null}
              </>
            ) : (
              <SentenceCard
                phrase={currentPhrase}
                onSelectWords={handleSelectWords}
                selectedWords={selectedWords}
              />
            )}

            {selectedWords.length === 0 && (
              <Group justify="space-between" mt="xl">
                <Button
                  variant="subtle"
                  onClick={handlePrevious}
                  disabled={isAtFirstCard}
                >
                  Previous
                </Button>
                <Text c="dimmed">
                  {currentCardId} {totalCards !== null ? `/ ${totalCards}` : ""}
                </Text>
                <Button
                  variant="subtle"
                  onClick={handleNext}
                  disabled={isAtLastCard}
                >
                  {isAtLastCard ? "Last Card" : "Next"}
                </Button>
              </Group>
            )}
          </>
        ) : null}
      </Stack>
    </Container>
  );
}
