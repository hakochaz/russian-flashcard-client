import type { Route } from "./+types/create-grammar";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput, CopyButton, ActionIcon, Tooltip } from "@mantine/core";
import { useState } from "react";
import { fetchPhraseBaseForm, synthesizeSentenceAudio } from "../api/api";
import { useAuth } from "../auth/AuthProvider";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Create Grammar Cards" }];
}

interface PhraseResult {
  phraseAnswer: string;
  bracketedSentence: string;
  audioUrl: string;
}

export default function CreateGrammar() {
  const [sentence, setSentence] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [result, setResult] = useState<PhraseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { acquireToken } = useAuth();

  const handleUseSentence = () => {
    // Split sentence into words
    const wordArray = sentence.split(/\s+/).filter(w => w.length > 0);
    setWords(wordArray);
    setSelectedIndices([]);
    setResult(null);
  };

  const toggleWordSelection = (index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        // Deselect this word
        return prev.filter(i => i !== index);
      } else {
        // Check if we can add this word
        if (prev.length === 0) {
          // First selection
          return [index];
        } else {
          // Check if the word is consecutive
          const min = Math.min(...prev);
          const max = Math.max(...prev);
          
          if (index === min - 1 || index === max + 1) {
            // Word is adjacent, add it
            return [...prev, index].sort((a, b) => a - b);
          } else if (index > min && index < max) {
            // Word is in the middle of selection
            return [...prev, index].sort((a, b) => a - b);
          } else {
            // Word is not consecutive, replace selection
            return [index];
          }
        }
      }
    });
  };

  const isConsecutiveSelection = () => {
    if (selectedIndices.length === 0) return true;
    const sorted = [...selectedIndices].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        return false;
      }
    }
    return true;
  };

  const handleCreateFlashcard = async () => {
    if (!isConsecutiveSelection()) {
      alert("Please select only consecutive words");
      return;
    }

    const sorted = [...selectedIndices].sort((a, b) => a - b);
    const selectedWords = sorted.map(i => words[i]);
    
    // Join with spaces and remove punctuation at the end
    const wordsString = selectedWords.join(" ").replace(/[?!.,;:]+$/, "");

    setIsLoading(true);
    try {
      const token = await acquireToken();
      const [phraseData, audioUrl] = await Promise.all([
        fetchPhraseBaseForm(sentence, wordsString, token),
        synthesizeSentenceAudio(sentence, token)
      ]);

      if (phraseData && audioUrl) {
        setResult({
          phraseAnswer: phraseData.phraseAnswer,
          bracketedSentence: phraseData.bracketedSentence,
          audioUrl: audioUrl
        });
      }
    } catch (err) {
      // Fallback without token
      try {
        const [phraseData, audioUrl] = await Promise.all([
          fetchPhraseBaseForm(sentence, wordsString),
          synthesizeSentenceAudio(sentence)
        ]);

        if (phraseData && audioUrl) {
          setResult({
            phraseAnswer: phraseData.phraseAnswer,
            bracketedSentence: phraseData.bracketedSentence,
            audioUrl: audioUrl
          });
        }
      } catch (error) {
        console.error("Failed to create grammar flashcard:", error);
        alert("Failed to create flashcard. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedIndices([]);
  };

  return (
    <Container size="md" className="pt-16 pb-16">
      <Stack gap="lg">
        <div>
          <Title order={2}>Create Grammar Cards</Title>
          <Text mt="sm" c="dimmed">
            Enter a sentence and select consecutive words to create a grammar flashcard
          </Text>

          <Group mt="md" align="center">
            <TextInput
              placeholder="Enter sentence"
              value={sentence}
              onChange={(e) => setSentence(e.currentTarget.value)}
              size="md"
              style={{ flex: 1 }}
            />
            <Button onClick={handleUseSentence} variant="light" size="sm" ml="sm">
              Use
            </Button>
          </Group>
        </div>

        {words.length > 0 && !result && (
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              <div>
                <Text size="sm" c="dimmed" mb="md">
                  Click on consecutive words to select them:
                </Text>
                <Paper 
                  p="md" 
                  bg="gray.0" 
                  radius="sm" 
                  style={{ lineHeight: 1.8, minHeight: "80px", display: "flex", alignItems: "center" }}
                >
                  <Group gap="xs" wrap="wrap">
                    {words.map((word, index) => (
                      <Button
                        key={index}
                        variant={selectedIndices.includes(index) ? "filled" : "light"}
                        size="sm"
                        onClick={() => toggleWordSelection(index)}
                        style={{ cursor: "pointer" }}
                      >
                        {word}
                      </Button>
                    ))}
                  </Group>
                </Paper>
              </div>

              {selectedIndices.length > 0 && (
                <Group justify="flex-end">
                  <Button variant="light" onClick={() => setSelectedIndices([])}>
                    Clear Selection
                  </Button>
                  <Button 
                    onClick={handleCreateFlashcard} 
                    loading={isLoading}
                    disabled={!isConsecutiveSelection()}
                  >
                    Create Flashcard
                  </Button>
                </Group>
              )}
            </Stack>
          </Paper>
        )}

        {result && (
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Button
                  variant="subtle"
                  onClick={handleReset}
                >
                  ← Create Another
                </Button>
              </Group>

              <div>
                <Text size="sm" c="dimmed" mb="xs">
                  Bracketed Sentence:
                </Text>
                <Paper p="md" bg="gray.0" radius="sm">
                  <Group justify="space-between" align="center">
                    <Text fw={500}>{result.bracketedSentence}</Text>
                    <CopyButton value={result.bracketedSentence}>
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
                  Phrase Answer:
                </Text>
                <Paper p="md" bg="gray.0" radius="sm">
                  <Group justify="space-between" align="center">
                    <Text fw={500}>{result.phraseAnswer}</Text>
                    <CopyButton value={result.phraseAnswer}>
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
                      <source src={result.audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <CopyButton value={result.audioUrl}>
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
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
