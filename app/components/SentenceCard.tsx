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
    <Paper p="xl" radius="lg" shadow="sm" className="bg-white border border-gray-100">
      <Stack gap="lg">
        <div>
          <Text size="sm" c="dimmed" mb="md" className="flex items-center gap-2">
            <span>💡</span> Click on words to select them for flashcard creation
          </Text>
          <Paper 
            p="lg" 
            className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200" 
            radius="md" 
            style={{ lineHeight: 2, minHeight: "100px", display: "flex", alignItems: "center" }}
          >
            <Group gap="sm" wrap="wrap">
              {words.map((word, index) => (
                <Button
                  key={index}
                  variant={localSelectedWords.includes(word) ? "filled" : "light"}
                  size="md"
                  onClick={() => toggleWord(word)}
                  className={localSelectedWords.includes(word) 
                    ? "shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all" 
                    : "hover:shadow-sm transform hover:-translate-y-0.5 transition-all"}
                  styles={{
                    root: {
                      fontWeight: 500,
                    }
                  }}
                >
                  {word}
                </Button>
              ))}
            </Group>
          </Paper>
        </div>

        {localSelectedWords.length > 0 && (
          <Group justify="flex-end" className="pt-2 border-t border-gray-100">
            <Button 
              variant="light" 
              onClick={() => setLocalSelectedWords([])}
              className="hover:shadow-sm transition-all"
            >
              Clear Selection
            </Button>
            <Button 
              onClick={() => onSelectWords(localSelectedWords)}
              className="shadow-md hover:shadow-lg transition-all"
              leftSection={<span>✨</span>}
            >
              Create Flashcards ({localSelectedWords.length})
            </Button>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
