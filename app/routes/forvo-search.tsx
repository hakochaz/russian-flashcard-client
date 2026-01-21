import type { Route } from "./+types/forvo-search";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput, Checkbox } from "@mantine/core";
import { useState } from "react";
import { searchForvoPhrase, fetchWordData, fetchWordVariations, type Phrase, type WordData, type ForvoSearchResult } from "../api/api";
import { useAuth } from "../auth/AuthProvider";
import { Flashcard } from "../components/Flashcard";
import { SentenceCard } from "../components/SentenceCard";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Forvo Search" }];
}

export default function ForvoSearch() {
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
      const token = await acquireToken();
      
      if (searchAllForms) {
        // First get word variations
        const variations = await fetchWordVariations(searchQuery, token);
        console.log("Word variations:", variations);
        
        // Search Forvo for each variation
        const forvoResultsArray = await Promise.all(
          variations.map(async (variation) => {
            const results = await searchForvoPhrase(variation, token);
            return results;
          })
        );
        console.log("Forvo results for all forms:", forvoResultsArray);

        // Flatten and convert to Phrase objects with unique IDs
        const seenPhrases = new Set<string>();
        let resultIndex = 0;
        forvoResultsArray.flat().forEach((forvoResult) => {
          if (forvoResult && !seenPhrases.has(forvoResult.phrase)) {
            seenPhrases.add(forvoResult.phrase);
            allResults.push({
              CardId: `forvo-${resultIndex++}`,
              Phrase: forvoResult.phrase,
              PhraseStress: "",
              Audio: forvoResult.audio || "",
              Translation: "",
            });
          }
        });
      } else {
        // Single phrase search
        const forvoResults = await searchForvoPhrase(searchQuery, token);
        console.log("Forvo results:", forvoResults);
        
        // Convert array of results to Phrase objects
        forvoResults.forEach((forvoResult, index) => {
          allResults.push({
            CardId: `forvo-${index}`,
            Phrase: forvoResult.phrase,
            PhraseStress: "",
            Audio: forvoResult.audio || "",
            Translation: "",
          });
        });
      }

      console.log("All results to set:", allResults);
      setResults(allResults);
      setCurrentResultIndex(0);
    } catch (error) {
      console.error("Failed to search Forvo:", error);
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
        const token = await acquireToken();
        const dataList = await Promise.all(
          words.map(word => fetchWordData(word, currentPhrase.Phrase, token))
        );
        setSelectedWordDataList(dataList);
        
        // Set PhraseStress to the same as Phrase
        setResults(prevResults => {
          const newResults = [...prevResults];
          newResults[currentResultIndex] = {
            ...newResults[currentResultIndex],
            PhraseStress: newResults[currentResultIndex].Phrase
          };
          return newResults;
        });
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
          <Title order={2}>Forvo Search</Title>
          <Text mt="sm" c="dimmed">
            Search for Russian phrases with native speaker audio from Forvo
          </Text>
        </div>

        <Group gap="sm">
          <TextInput
            placeholder="Enter a phrase to search..."
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
                      isForvoAudio={true}
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
