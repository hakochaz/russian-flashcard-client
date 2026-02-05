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
    <Paper p="xl" radius="lg" shadow="sm" className="bg-white border border-gray-100">
      <Stack gap="lg">
        <Group justify="space-between" align="center" className="pb-4 border-b border-gray-100">
          <Button
            variant="light"
            onClick={onBack}
            leftSection={<span>←</span>}
            className="hover:shadow-sm"
          >
            Back to Sentence
          </Button>
          <div className="px-3 py-1.5 bg-blue-50 rounded-full">
            <Text size="sm" fw={600} c="blue.7">
              {selectedWord}
            </Text>
          </div>
        </Group>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Text c="dimmed">Loading word data...</Text>
          </div>
        ) : wordData ? (
          <Stack gap="md">
            <div>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs" className="tracking-wider">
                Base Form
              </Text>
              <Paper p="md" className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100" radius="md">
                <Group justify="space-between" align="center">
                  <Text fw={600} size="lg" c="blue.9">{wordData.baseFormStress || wordData.baseForm}</Text>
                  <CopyButton value={wordData.baseFormStress || wordData.baseForm}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                        <ActionIcon
                          color={copied ? "teal" : "blue"}
                          variant="subtle"
                          onClick={copy}
                          size="lg"
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
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs" className="tracking-wider">
                English Translation
              </Text>
              <Paper p="md" className="bg-gray-50 border border-gray-200" radius="md">
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
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs" className="tracking-wider">
                Russian Meaning
              </Text>
              <Paper p="md" className="bg-gray-50 border border-gray-200" radius="md">
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
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs" className="tracking-wider">
                Phrase
              </Text>
              <Paper p="md" className="bg-gray-50 border border-gray-200" radius="md">
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
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs" className="tracking-wider">
                Phrase with Stress Marks
              </Text>
              <Paper p="md" className="bg-gray-50 border border-gray-200" radius="md">
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
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs" className="tracking-wider">
                Audio
              </Text>
              <Paper p="md" className="bg-gray-50 border border-gray-200" radius="md">
                <Group justify="space-between" align="center" wrap="nowrap">
                  <audio controls style={{ flex: 1 }} className="h-10">
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
          <div className="flex items-center justify-center py-12">
            <Text c="red" fw={500}>Failed to load word data</Text>
          </div>
        )}
      </Stack>
      
      {wordData && <GoogleImageSearch searchQuery={selectedWord} />}
    </Paper>
  );
}
