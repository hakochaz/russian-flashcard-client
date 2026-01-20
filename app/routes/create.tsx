import type { Route } from "./+types/create";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { fetchWordData, synthesizeSentenceAudio, getStressedSentence, type Phrase, type WordData } from "../api/api";
import { useAuth } from "../auth/AuthProvider";
import { Flashcard } from "../components/Flashcard";
import { SentenceCard } from "../components/SentenceCard";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Create" }];
}

export default function Create() {
  const [input, setInput] = useState("");
  const [currentPhrase, setCurrentPhrase] = useState<Phrase | null>(null);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [selectedWordDataList, setSelectedWordDataList] = useState<WordData[]>([]);
  const [currentSelectedWordIndex, setCurrentSelectedWordIndex] = useState(0);
  const [creatingFlashcards, setCreatingFlashcards] = useState(false);

  const { acquireToken } = useAuth();

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
          const [dataList, audioUrl, stressedSentence] = await Promise.all([
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
              PhraseStress: stressedSentence || prev.PhraseStress
            };
          });
        } catch (err) {
          const [dataList, audioUrl, stressedSentence] = await Promise.all([
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
              PhraseStress: stressedSentence || prev.PhraseStress
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
    <Container size="md" className="pt-16 pb-16">
      <Stack gap="lg">
        <div>
          <Title order={2}>Create</Title>
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
