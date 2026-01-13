import type { Route } from "./+types/all-sentences";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput } from "@mantine/core";
import { useState, useEffect } from "react";
import { fetchPhraseById, fetchCardCount, fetchWordData, type Phrase, type WordData } from "../api/api";
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
