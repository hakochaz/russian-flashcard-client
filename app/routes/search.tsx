import type { Route } from "./+types/search";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { fetchWordData, searchExamples, type Phrase, type WordData } from "../api/api";
import { Flashcard } from "../components/Flashcard";
import { SentenceCard } from "../components/SentenceCard";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Search" }];
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Phrase[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [selectedWordDataList, setSelectedWordDataList] = useState<WordData[]>([]);
  const [currentSelectedWordIndex, setCurrentSelectedWordIndex] = useState(0);
  const [creatingFlashcards, setCreatingFlashcards] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setCurrentResultIndex(0);
    setSelectedWords([]);

    try {
      const data = await searchExamples(searchQuery);
      setResults(data);
    } catch (error) {
      console.error("Failed to search:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectWords = async (words: string[]) => {
    setSelectedWords(words);
    setCurrentSelectedWordIndex(0);
    setCreatingFlashcards(true);
    
    try {
      if (results.length > 0 && currentResultIndex < results.length) {
        const currentPhrase = results[currentResultIndex];
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
    if (currentResultIndex > 0) {
      setCurrentResultIndex(prev => prev - 1);
      handleBackToSentence();
    }
  };

  const handleNext = () => {
    if (currentResultIndex < results.length - 1) {
      setCurrentResultIndex(prev => prev + 1);
      handleBackToSentence();
    }
  };

  const isAtFirstResult = currentResultIndex === 0;
  const isAtLastResult = currentResultIndex === results.length - 1;

  const currentPhrase = results.length > 0 ? results[currentResultIndex] : null;

  return (
    <Container size="md" className="pt-16 pb-16">
      <Stack gap="lg">
        <div>
          <Title order={2}>Search</Title>
          <Text mt="sm" c="dimmed">
            Search for a word to find example sentences
          </Text>
        </div>

        <Group gap="sm">
          <TextInput
            placeholder="Enter a word to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            style={{ flex: 1 }}
          />
          <Button onClick={handleSearch} loading={isSearching}>
            Search
          </Button>
        </Group>

        {hasSearched && !isSearching && results.length === 0 && (
          <Paper p="lg" radius="md" withBorder>
            <Text c="dimmed">No results found for "{searchQuery}"</Text>
          </Paper>
        )}

        {results.length > 0 && currentPhrase && (
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
                  disabled={isAtFirstResult}
                >
                  Previous
                </Button>
                <Text c="dimmed">
                  {currentResultIndex + 1} / {results.length}
                </Text>
                <Button
                  variant="subtle"
                  onClick={handleNext}
                  disabled={isAtLastResult}
                >
                  {isAtLastResult ? "Last Result" : "Next"}
                </Button>
              </Group>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
