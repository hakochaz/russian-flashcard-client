import type { Route } from "./+types/all-sentences";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput } from "@mantine/core";
import { useState, useEffect } from "react";
import { fetchPhraseById, fetchCardCount, fetchWordData, type Phrase, type WordData } from "../api/api";
import { useAuth } from "../auth/AuthProvider";
import { Flashcard } from "../components/Flashcard";
import { SentenceCard } from "../components/SentenceCard";

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

  const { acquireToken } = useAuth();

  // Load total card count on mount
  useEffect(() => {
    const loadCardCount = async () => {
      try {
        const token = await acquireToken();
        const count = await fetchCardCount(token);
        setTotalCards(count);
      } catch (err) {
        // acquireToken may redirect the page (AuthProvider throws), ignore here
        console.debug("Could not acquire token for card count", err);
      }
    };

    loadCardCount();
  }, [acquireToken]);

  // Load phrase when currentCardId changes
  useEffect(() => {
    const loadPhrase = async () => {
      setPhraseLoading(true);
      setError(null);
      try {
        const token = await acquireToken();
        const phrase = await fetchPhraseById(currentCardId, token);
        if (phrase) {
          setCurrentPhrase(phrase);
        } else {
          setError("Card not found");
          setCurrentPhrase(null);
        }
      } catch (err) {
        console.debug("Could not acquire token or fetch phrase", err);
      } finally {
        setPhraseLoading(false);
      }
    };

    loadPhrase();
  }, [currentCardId]);

  const handleSelectWords = async (words: string[]) => {
    setSelectedWords(words);
    setCurrentSelectedWordIndex(0);
    setCreatingFlashcards(true);
    
    try {
      if (currentPhrase) {
        try {
          const token = await acquireToken();
          const dataList = await Promise.all(
            words.map(word => fetchWordData(word, currentPhrase.Phrase, token))
          );
          setSelectedWordDataList(dataList);
        } catch (err) {
          console.debug("Could not acquire token for word data", err);
          const dataList = await Promise.all(
            words.map(word => fetchWordData(word, currentPhrase.Phrase))
          );
          setSelectedWordDataList(dataList);
        }
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
    <div>
      <div className="mb-8">
        <Title order={1} className="text-3xl font-bold text-gray-900 mb-2">
          All Sentences
        </Title>
        <Text c="dimmed" size="lg">
          Select words from sentences to create flashcards
        </Text>
      </div>

      <Stack gap="xl">
        <Paper p="md" className="bg-white border border-gray-200 shadow-sm" radius="lg">
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed" className="flex items-center gap-2">
              <span>📊</span>
              {totalCards !== null ? (
                <>Viewing card <strong>{currentCardId}</strong> of <strong>{totalCards}</strong></>
              ) : (
                <>Card <strong>{currentCardId}</strong></>
              )}
            </Text>
            <Group gap="xs" wrap="nowrap">
              <TextInput
                placeholder="Go to card..."
                value={goToCardInput}
                onChange={(e) => setGoToCardInput(e.currentTarget.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleGoToCard();
                  }
                }}
                size="sm"
                w={120}
                className="transition-all focus-within:shadow-sm"
              />
              <Button 
                onClick={handleGoToCard} 
                variant="light" 
                size="sm"
                className="hover:shadow-sm transition-all"
              >
                Go
              </Button>
            </Group>
          </Group>
        </Paper>

        {phraseLoading ? (
          <Paper p="xl" radius="lg" shadow="sm" className="bg-white border border-gray-100">
            <div className="flex items-center justify-center py-12">
              <Text c="dimmed">Loading card...</Text>
            </div>
          </Paper>
        ) : error ? (
          <Paper p="xl" radius="lg" shadow="sm" className="bg-white border border-red-100">
            <div className="flex items-center justify-center py-12">
              <Text c="red" fw={500}>{error}</Text>
            </div>
          </Paper>
        ) : currentPhrase ? (
          <>
            {selectedWords.length > 0 ? (
              <>
                {creatingFlashcards ? (
                  <Paper p="xl" radius="lg" shadow="sm" className="bg-white border border-gray-100">
                    <div className="flex items-center justify-center py-12">
                      <Text c="dimmed">Creating flashcards...</Text>
                    </div>
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

                    <Paper p="md" className="bg-white border border-gray-200 shadow-sm" radius="lg">
                      <Group justify="space-between">
                        <Button
                          variant="light"
                          onClick={handlePreviousWord}
                          disabled={isAtFirstWord}
                          leftSection={<span>←</span>}
                          className="hover:shadow-sm transition-all"
                        >
                          Previous Word
                        </Button>
                        <div className="px-4 py-2 bg-blue-50 rounded-full">
                          <Text size="sm" fw={600} c="blue.7">
                            {currentSelectedWordIndex + 1} / {selectedWords.length}
                          </Text>
                        </div>
                        <Button
                          variant="light"
                          onClick={handleNextWord}
                          disabled={isAtLastWord}
                          rightSection={<span>→</span>}
                          className="hover:shadow-sm transition-all"
                        >
                          Next Word
                        </Button>
                      </Group>
                    </Paper>
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
              <Paper p="md" className="bg-white border border-gray-200 shadow-sm" radius="lg">
                <Group justify="space-between">
                  <Button
                    variant="light"
                    onClick={handlePrevious}
                    disabled={isAtFirstCard}
                    leftSection={<span>←</span>}
                    className="hover:shadow-sm transition-all"
                  >
                    Previous
                  </Button>
                  <div className="px-4 py-2 bg-gray-100 rounded-full">
                    <Text size="sm" fw={600} c="gray.7">
                      Card {currentCardId} {totalCards !== null ? `/ ${totalCards}` : ""}
                    </Text>
                  </div>
                  <Button
                    variant="light"
                    onClick={handleNext}
                    disabled={isAtLastCard}
                    rightSection={<span>→</span>}
                    className="hover:shadow-sm transition-all"
                  >
                    {isAtLastCard ? "Last Card" : "Next"}
                  </Button>
                </Group>
              </Paper>
            )}
          </>
        ) : null}
      </Stack>
    </div>
  );
}
