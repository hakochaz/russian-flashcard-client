import type { Route } from "./+types/combined-search";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput, Checkbox, Alert } from "@mantine/core";
import { useState, useEffect } from "react";
import { searchExamples, searchForvoPhrase, fetchWordData, fetchWordVariations, getStressedSentence, type Phrase, type WordData } from "../api/api";
import { useAuth } from "../auth/AuthProvider";
import { Flashcard } from "../components/Flashcard";
import { SentenceCard } from "../components/SentenceCard";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Combined Search" }];
}

export default function CombinedSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Phrase[]>([]);
  const [forvoFlags, setForvoFlags] = useState<Set<number>>(new Set());
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
  const { acquireToken } = useAuth();

  const handleImportSuccess = () => {
    setImportSuccess(true);
    setImportFading(false);
    setTimeout(() => setImportFading(true), 2000);
    setTimeout(() => setImportSuccess(false), 4000);
  };

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

  const performSearch = async (): Promise<{ sentenceResults: Phrase[]; forvoResults: Phrase[] }> => {
    const token = await acquireToken();

    if (searchAllForms) {
      const rawVariations = await fetchWordVariations(searchQuery, token);
      const variations = rawVariations.length > 0 ? rawVariations : [searchQuery];
      if (!variations.includes(searchQuery)) {
        variations.unshift(searchQuery);
      }

      const [sentenceResultsArray, forvoResultsArray] = await Promise.all([
        Promise.all(variations.map((variation) => searchExamples(variation, token))),
        Promise.all(variations.map((variation) => searchForvoPhrase(variation, token))),
      ]);

      // Deduplicate sentence results
      const seenSentenceIds = new Set<string>();
      const sentenceResults = sentenceResultsArray.flat().filter((phrase) => {
        if (seenSentenceIds.has(phrase.CardId)) return false;
        seenSentenceIds.add(phrase.CardId);
        return true;
      });

      // Order Forvo results: best (first) of each variation first, then remaining
      const bestForvo = forvoResultsArray.map((r) => r[0]).filter(Boolean);
      const remainingForvo = forvoResultsArray.flatMap((r) => r.slice(1));
      const orderedForvo = [...bestForvo, ...remainingForvo];

      const seenForvoPhrases = new Set<string>();
      // Also exclude any phrases already found in sentence results
      for (const s of sentenceResults) {
        seenForvoPhrases.add(s.Phrase);
      }

      let forvoIndex = 0;
      const forvoResults = orderedForvo
        .filter((r) => {
          if (!r || seenForvoPhrases.has(r.phrase)) return false;
          seenForvoPhrases.add(r.phrase);
          return true;
        })
        .map((r) => ({
          CardId: `forvo-${forvoIndex++}`,
          Phrase: r.phrase,
          PhraseStress: r.phrase,
          Audio: r.audio || "",
          Translation: "",
        }));

      return { sentenceResults, forvoResults };
    }

    // Single phrase search — run both in parallel
    const [sentenceResults, forvoRaw] = await Promise.all([
      searchExamples(searchQuery, token),
      searchForvoPhrase(searchQuery, token),
    ]);

    const seenPhrases = new Set<string>();
    for (const s of sentenceResults) {
      seenPhrases.add(s.Phrase);
    }

    let forvoIndex = 0;
    const forvoResults = forvoRaw
      .filter((r) => {
        if (seenPhrases.has(r.phrase)) return false;
        seenPhrases.add(r.phrase);
        return true;
      })
      .map((r) => ({
        CardId: `forvo-${forvoIndex++}`,
        Phrase: r.phrase,
        PhraseStress: r.phrase,
        Audio: r.audio || "",
        Translation: "",
      }));

    return { sentenceResults, forvoResults };
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    handleBackToSentence();

    try {
      let { sentenceResults, forvoResults } = await performSearch();

      // Retry once if both empty
      if (sentenceResults.length === 0 && forvoResults.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        ({ sentenceResults, forvoResults } = await performSearch());
      }

      const combined = [...sentenceResults, ...forvoResults];
      const forvoStartIndex = sentenceResults.length;
      const flags = new Set<number>();
      for (let i = forvoStartIndex; i < combined.length; i++) {
        flags.add(i);
      }

      setResults(combined);
      setForvoFlags(flags);
      setCurrentResultIndex(0);
    } catch (error) {
      console.error("Failed to search:", error);
      setResults([]);
      setForvoFlags(new Set());
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
        const isForvo = forvoFlags.has(currentResultIndex);

        if (isForvo) {
          const [dataList, stressedPhrase] = await Promise.all([
            Promise.all(words.map((word) => fetchWordData(word, currentPhrase.Phrase, token))),
            getStressedSentence(currentPhrase.Phrase, token),
          ]);

          setSelectedWordDataList(dataList);

          setResults((prevResults) => {
            const newResults = [...prevResults];
            newResults[currentResultIndex] = {
              ...newResults[currentResultIndex],
              PhraseStress: stressedPhrase || newResults[currentResultIndex].Phrase,
            };
            return newResults;
          });
        } else {
          const dataList = await Promise.all(
            words.map((word) => fetchWordData(word, currentPhrase.Phrase, token))
          );
          setSelectedWordDataList(dataList);
        }
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
    setCurrentSelectedWordIndex((prev) => Math.min(prev, newWords.length - 1));
  };

  const handlePreviousWord = () => {
    if (currentSelectedWordIndex > 0) {
      setCurrentSelectedWordIndex((prev) => prev - 1);
    }
  };

  const handleNextWord = () => {
    if (currentSelectedWordIndex < selectedWords.length - 1) {
      setCurrentSelectedWordIndex((prev) => prev + 1);
    }
  };

  const isAtFirstWord = currentSelectedWordIndex === 0;
  const isAtLastWord = currentSelectedWordIndex === selectedWords.length - 1;

  const handlePrevious = () => {
    if (currentResultIndex > 0) {
      setCurrentResultIndex((prev) => prev - 1);
      handleBackToSentence();
    }
  };

  const handleNext = () => {
    if (currentResultIndex < results.length - 1) {
      setCurrentResultIndex((prev) => prev + 1);
      handleBackToSentence();
    }
  };

  const isAtFirstResult = currentResultIndex === 0;
  const isAtLastResult = currentResultIndex === results.length - 1;

  const currentPhrase = results.length > 0 ? results[currentResultIndex] : null;
  const currentIsForvo = forvoFlags.has(currentResultIndex);

  return (
    <Container size="md" className="pt-6 pb-16">
      <Stack gap="lg">
        {importSuccess && (
          <Alert color="teal" style={{ position: "fixed", top: 72, right: 20, width: 280, zIndex: 9999, transition: "opacity 2s ease", opacity: importFading ? 0 : 1 }}>
            Imported successfully!
          </Alert>
        )}
        <div>
          <Title order={2}>Combined Search</Title>
          <Text mt="sm" c="dimmed">
            Search sentences and Forvo for Russian phrases
          </Text>
        </div>

        <Group gap="sm">
          <TextInput
            placeholder="Enter a word or phrase to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
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
                      key={`${currentSelectedWordIndex}-${selectedWords[currentSelectedWordIndex]}`}
                      phrase={currentPhrase}
                      selectedWord={selectedWords[currentSelectedWordIndex]}
                      wordData={selectedWordDataList[currentSelectedWordIndex]}
                      isLoading={false}
                      onBack={handleBackToSentence}
                      onImportSuccess={handleImportSuccess}
                      onImportDismiss={handleDismissCurrentCard}
                      isForvoAudio={currentIsForvo}
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
