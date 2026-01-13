import { Button, Paper, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import type { Phrase } from "../api/api";

interface SentenceCardProps {
  phrase: Phrase;
  onSelectWords: (words: string[]) => void;
  selectedWords: string[];
}

export function SentenceCard({ phrase, onSelectWords, selectedWords }: SentenceCardProps) {
  const words = phrase.Phrase.split(/\s+/);

  const toggleWord = (word: string) => {
    setLocalSelectedWords(prev =>
      prev.includes(word)
        ? prev.filter(w => w !== word)
        : [...prev, word]
    );
  };

  const [localSelectedWords, setLocalSelectedWords] = useState<string[]>([]);

  return (
    <Paper p="lg" radius="md" withBorder>
      <Stack gap="md">
        <div>
          <Text size="sm" c="dimmed" mb="md">
            Click on words to select them, then confirm:
          </Text>
          <Paper p="md" bg="gray.0" radius="sm" style={{ lineHeight: 1.8, minHeight: "80px", display: "flex", alignItems: "center" }}>
            <Group gap="xs" wrap="wrap">
              {words.map((word, index) => (
                <Button
                  key={index}
                  variant={localSelectedWords.includes(word) ? "filled" : "light"}
                  size="sm"
                  onClick={() => toggleWord(word)}
                  style={{ cursor: "pointer" }}
                >
                  {word}
                </Button>
              ))}
            </Group>
          </Paper>
        </div>

        {localSelectedWords.length > 0 && (
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setLocalSelectedWords([])}>
              Clear Selection
            </Button>
            <Button onClick={() => onSelectWords(localSelectedWords)}>
              Create Flashcards ({localSelectedWords.length})
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
