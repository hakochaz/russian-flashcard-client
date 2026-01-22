import { Button, Paper, Group, Stack, CopyButton, ActionIcon, Tooltip, Text } from "@mantine/core";
import type { Phrase, WordData } from "../api/api";
import { GoogleImageSearch } from "./GoogleImageSearch";

interface FlashcardProps {
  phrase: Phrase;
  selectedWord: string;
  wordData: WordData | null;
  isLoading: boolean;
  onBack: () => void;
  isForvoAudio?: boolean;
}

export function Flashcard({ phrase, selectedWord, wordData, isLoading, onBack, isForvoAudio = false }: FlashcardProps) {
  return (
    <Paper p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Button
            variant="subtle"
            onClick={onBack}
          >
            ← Back to Sentence
          </Button>
          <Text fw={600} c="dimmed">
            Selected word: "{selectedWord}"
          </Text>
        </Group>

        {isLoading ? (
          <Text>Loading word data...</Text>
        ) : wordData ? (
          <Stack gap="sm">
            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Base Form:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="center">
                  <Text fw={500}>{wordData.baseForm}</Text>
                  <CopyButton value={wordData.baseForm}>
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
                English Translation:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="center">
                  <Text fw={500}>{wordData.englishTranslation}</Text>
                  <CopyButton value={wordData.englishTranslation}>
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
                Russian Meaning:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="flex-start">
                  <Text fw={500} style={{ flex: 1 }}>{wordData.russianMeaning}</Text>
                  <CopyButton value={wordData.russianMeaning}>
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
                Phrase:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="center">
                  <Text fw={500}>{phrase.Phrase}</Text>
                  <CopyButton value={phrase.Phrase}>
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
                Phrase with stress marks:
              </Text>
              <Paper p="md" bg="gray.0" radius="sm">
                <Group justify="space-between" align="center">
                  <Text fw={500}>{phrase.PhraseStress}</Text>
                  <CopyButton value={phrase.PhraseStress}>
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
                    <source src={phrase.Audio} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <CopyButton value={isForvoAudio ? phrase.Audio + '.mp3' : phrase.Audio}>
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
        ) : (
          <Text c="red">Failed to load word data</Text>
        )}
      </Stack>
      
      {wordData && <GoogleImageSearch searchQuery={selectedWord} />}
    </Paper>
  );
}
