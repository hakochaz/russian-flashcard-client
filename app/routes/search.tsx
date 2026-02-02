import type { Route } from "./+types/search";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput, Checkbox } from "@mantine/core";
import { useState } from "react";
import { fetchWordData, searchExamples, fetchWordVariations, type Phrase, type WordData } from "../api/api";
import { useAuth } from "../auth/AuthProvider";
import { Flashcard } from "../components/Flashcard";
import { SentenceCard } from "../components/SentenceCard";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Sentences Search" }];
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
  const [searchAllForms, setSearchAllForms] = useState(false);
  const { acquireToken } = useAuth();

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    handleBackToSentence();
    let allResults: Phrase[] = [];

    try {
      if (searchAllForms) {
        // Fetch word variations and search them (try with token, fall back without)
        try {
          const token = await acquireToken();
          const variations = await fetchWordVariations(searchQuery, token);

          const resultsArray = await Promise.all(
            variations.map((variation) => searchExamples(variation, token))
          );

          const seenIds = new Set<string>();
          allResults = resultsArray
            .flat()
            .filter((phrase) => {
              if (seenIds.has(phrase.CardId)) return false;
              seenIds.add(phrase.CardId);
              return true;
            });
        } catch (err) {
          console.debug("Could not acquire token for variations search, falling back:", err);
          const variations = await fetchWordVariations(searchQuery);
          const resultsArray = await Promise.all(
            variations.map((v) => searchExamples(v))
          );
          const seenIds = new Set<string>();
          allResults = resultsArray
            .flat()
            .filter((phrase) => {
              if (seenIds.has(phrase.CardId)) return false;
              seenIds.add(phrase.CardId);
              return true;
            });
        }
      } else {
        try {
          const token = await acquireToken();
          allResults = await searchExamples(searchQuery, token);
        } catch (err) {
          console.debug("Could not acquire token for search", err);
          allResults = await searchExamples(searchQuery);
        }
      }

      setResults(allResults);
      setCurrentResultIndex(0);
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
          <Title order={2}>Sentences Search</Title>
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

        <Checkbox
          label="Search all word forms"
          checked={searchAllForms}
          onChange={(e) => setSearchAllForms(e.currentTarget.checked)}
        />

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
