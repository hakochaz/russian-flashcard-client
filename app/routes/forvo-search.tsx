import type { Route } from "./+types/forvo-search";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput, Checkbox, Alert } from "@mantine/core";
import { useState, useEffect } from "react";
import { searchForvoPhrase, fetchWordData, fetchWordVariations, getStressedSentence, fetchFirstWhiteRow, type Phrase, type WordData } from "../api/api";
import { useAuth } from "../auth/AuthProvider";
import { Flashcard } from "../components/Flashcard";
import { SentenceCard } from "../components/SentenceCard";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Forvo Sentence Search" }];
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
  const [importSuccess, setImportSuccess] = useState(false);
  const [importFading, setImportFading] = useState(false);
  const [isLoadingWord, setIsLoadingWord] = useState(false);
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
      if (e.key === "ArrowLeft") {
        if (selectedWords.length > 0) {
          handlePreviousWord();
        } else if (results.length > 0) {
          handlePrevious();
        }
      } else if (e.key === "ArrowRight") {
        if (selectedWords.length > 0) {
          handleNextWord();
        } else if (results.length > 0) {
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedWords.length, currentSelectedWordIndex, currentResultIndex, results.length]);

  const handleGetWord = async () => {
    setIsLoadingWord(true);
    try {
      const token = await acquireToken();
      const value = await fetchFirstWhiteRow(token);
      if (value) setSearchQuery(value);
    } catch (error) {
      console.error("Failed to get word:", error);
    } finally {
      setIsLoadingWord(false);
    }
  };

  const performSearch = async (): Promise<Phrase[]> => {
    const token = await acquireToken();

    if (searchAllForms) {
      // First get word variations, always including the original query
      const rawVariations = await fetchWordVariations(searchQuery, token);
      const variations = rawVariations.length > 0 ? rawVariations : [searchQuery];
      if (!variations.includes(searchQuery)) {
        variations.unshift(searchQuery);
      }
      console.log("Word variations:", variations);

      // Search Forvo for each variation
      const forvoResultsArray = await Promise.all(
        variations.map(async (variation) => {
          const results = await searchForvoPhrase(variation, token);
          return results;
        })
      );
      console.log("Forvo results for all forms:", forvoResultsArray);

      // Put the best (first) result of each variation at the front of the list,
      // followed by the remaining results for each variation
      const bestResults = forvoResultsArray.map((results) => results[0]).filter(Boolean);
      const remainingResults = forvoResultsArray.flatMap((results) => results.slice(1));
      const orderedResults = [...bestResults, ...remainingResults];

      // Convert to Phrase objects with unique IDs, removing duplicates
      const seenPhrases = new Set<string>();
      let resultIndex = 0;
      const resultsWithoutStress = orderedResults.map((forvoResult) => {
        if (forvoResult && !seenPhrases.has(forvoResult.phrase)) {
          seenPhrases.add(forvoResult.phrase);
          return {
            CardId: `forvo-${resultIndex++}`,
            Phrase: forvoResult.phrase,
            PhraseStress: forvoResult.phrase,
            Audio: forvoResult.audio || "",
            Translation: "",
          };
        }
        return null;
      });
      return resultsWithoutStress.filter((result) => result !== null) as Phrase[];
    }

    // Single phrase search
    const forvoResults = await searchForvoPhrase(searchQuery, token);
    console.log("Forvo results:", forvoResults);

    // Convert array of results to Phrase objects without stress marks
    return forvoResults.map((forvoResult, index) => ({
      CardId: `forvo-${index}`,
      Phrase: forvoResult.phrase,
      PhraseStress: forvoResult.phrase,
      Audio: forvoResult.audio || "",
      Translation: "",
    }));
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    handleBackToSentence();

    try {
      let allResults = await performSearch();

      // The backend can occasionally return an empty result on the first
      // attempt (e.g. a cold start or transient Forvo rate limit). Retry
      // once after a short delay before reporting "no results".
      if (allResults.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        allResults = await performSearch();
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
        
        // Fetch word analysis and stress marks at the same time
        const [dataList, stressedPhrase] = await Promise.all([
          Promise.all(words.map(word => fetchWordData(word, currentPhrase.Phrase, token))),
          getStressedSentence(currentPhrase.Phrase, token)
        ]);
        
        setSelectedWordDataList(dataList);
        
        // Set PhraseStress with the stress marks
        setResults(prevResults => {
          const newResults = [...prevResults];
          newResults[currentResultIndex] = {
            ...newResults[currentResultIndex],
            PhraseStress: stressedPhrase || newResults[currentResultIndex].Phrase
          };
          return newResults;
        });
      }
    } catch (error) {
      console.error("Failed to fetch word data or stress marks:", error);
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
    <Container size="md" className="pt-6 pb-16">
      <Stack gap="lg">
        {importSuccess && (
          <Alert color="teal" style={{ position: "fixed", top: 72, right: 20, width: 280, zIndex: 9999, transition: "opacity 2s ease", opacity: importFading ? 0 : 1 }}>
            Imported successfully!
          </Alert>
        )}
        <div>
          <Title order={2}>Forvo Sentence Search</Title>
          <Text mt="sm" c="dimmed">
            Search for Russian phrases with native speaker audio from Forvo
          </Text>
        </div>

        <Group gap="sm">
          <TextInput
            placeholder="Enter a phrase to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            style={{ flex: 1 }}
          />
          <Button onClick={handleSearch} loading={isSearching}>
            Search
          </Button>
          <Button variant="light" onClick={handleGetWord} loading={isLoadingWord}>
            Get Word
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
                      key={`${currentSelectedWordIndex}-${selectedWords[currentSelectedWordIndex]}`}
                      phrase={currentPhrase}
                      selectedWord={selectedWords[currentSelectedWordIndex]}
                      wordData={selectedWordDataList[currentSelectedWordIndex]}
                      isLoading={false}
                      onBack={handleBackToSentence}
                      onImportSuccess={handleImportSuccess}
                      onImportDismiss={handleDismissCurrentCard}
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
