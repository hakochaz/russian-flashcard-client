import type { Route } from "./+types/create";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput, Alert } from "@mantine/core";
import { useState, useEffect } from "react";
import { fetchWordData, synthesizeSentenceAudio, getStressedSentence, type Phrase, type WordData } from "../api/api";
import { useAuth } from "../auth/AuthProvider";
import { Flashcard } from "../components/Flashcard";
import { SentenceCard } from "../components/SentenceCard";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Create Sentence Card" }];
}

export default function Create() {
  const [input, setInput] = useState("");
  const [currentPhrase, setCurrentPhrase] = useState<Phrase | null>(null);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [selectedWordDataList, setSelectedWordDataList] = useState<WordData[]>([]);
  const [currentSelectedWordIndex, setCurrentSelectedWordIndex] = useState(0);
  const [creatingFlashcards, setCreatingFlashcards] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importFading, setImportFading] = useState(false);

  const { acquireToken } = useAuth();

  const handleImportSuccess = () => {
    setImportSuccess(true);
    setImportFading(false);
    setTimeout(() => setImportFading(true), 2000);
    setTimeout(() => setImportSuccess(false), 4000);
  };

  // Handle keyboard navigation with arrow keys
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (selectedWords.length > 0) {
        if (e.key === "ArrowLeft") {
          handlePreviousWord();
        } else if (e.key === "ArrowRight") {
          handleNextWord();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedWords.length, currentSelectedWordIndex]);

  const handleUseInput = () => {
    const phrase: Phrase = {
      CardId: "0",
      Phrase: input,
      PhraseStress: "",
      Audio: "",
      Translation: "",
    };
    setCurrentPhrase(phrase);
    setSelectedWords([]);
    setSelectedWordDataList([]);
    setCurrentSelectedWordIndex(0);
  };

  const handleSelectWords = async (words: string[]) => {
    setSelectedWords(words);
    setCurrentSelectedWordIndex(0);
    setCreatingFlashcards(true);

    try {
      if (currentPhrase) {
        try {
          const token = await acquireToken();
          const [dataList, audioUrl, stressedPhrase] = await Promise.all([
            Promise.all(words.map(word => fetchWordData(word, currentPhrase.Phrase, token))),
            synthesizeSentenceAudio(currentPhrase.Phrase, token),
            getStressedSentence(currentPhrase.Phrase, token)
          ]);
          setSelectedWordDataList(dataList);
          setCurrentPhrase(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              Audio: audioUrl || prev.Audio,
              PhraseStress: stressedPhrase || prev.Phrase
            };
          });
        } catch (err) {
          const [dataList, audioUrl, stressedPhrase] = await Promise.all([
            Promise.all(words.map(word => fetchWordData(word, currentPhrase.Phrase))),
            synthesizeSentenceAudio(currentPhrase.Phrase),
            getStressedSentence(currentPhrase.Phrase)
          ]);
          setSelectedWordDataList(dataList);
          setCurrentPhrase(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              Audio: audioUrl || prev.Audio,
              PhraseStress: stressedPhrase || prev.Phrase
            };
          });
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

  const handleDismissCurrentCard = () => {
    if (selectedWords.length <= 1) {
      handleBackToSentence();
      return;
    }
    const newWords = selectedWords.filter((_, i) => i !== currentSelectedWordIndex);
    const newDataList = selectedWordDataList.filter((_, i) => i !== currentSelectedWordIndex);
    setSelectedWords(newWords);
    setSelectedWordDataList(newDataList);
    setCurrentSelectedWordIndex(prev => Math.min(prev, newWords.length - 1));
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

  return (
    <Container size="md" className="pt-6 pb-16">
      <Stack gap="lg">
        {importSuccess && (
          <Alert color="teal" style={{ position: "fixed", top: 72, right: 20, width: 280, zIndex: 9999, transition: "opacity 2s ease", opacity: importFading ? 0 : 1 }}>
            Imported successfully!
          </Alert>
        )}
        <div>
          <Title order={2}>Create Sentence Cards</Title>
          <Text mt="sm" c="dimmed">
            Enter a sentence and select words to create flashcards
          </Text>

          <Group mt="md" align="center">
            <TextInput
              placeholder="Enter sentence"
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              size="md"
              style={{ flex: 1 }}
            />
            <Button onClick={handleUseInput} variant="light" size="sm" ml="sm">
              Use
            </Button>
          </Group>
        </div>

        {currentPhrase ? (
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
                      onImportSuccess={handleImportSuccess}
                      onImportDismiss={handleDismissCurrentCard}
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
          </>
        ) : null}
      </Stack>
    </Container>
  );
}
