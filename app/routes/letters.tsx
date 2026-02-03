import type { Route } from "./+types/letters";
import { Container, Title, Text, Paper, Group, Stack, ActionIcon, Button } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { fetchForvoPronunciations, sortPronunciations, type Pronunciation } from "../api/api";
import { useAuth } from "../auth/AuthProvider";

const russianLetters = [
  "а",
  "б",
  "в",
  "г",
  "д",
  "е",
  "ё",
  "ж",
  "з",
  "и",
  "й",
  "к",
  "л",
  "м",
  "н",
  "о",
  "п",
  "р",
  "с",
  "т",
  "у",
  "ф",
  "х",
  "ц",
  "ч",
  "ш",
  "щ",
  "ъ",
  "ы",
  "ь",
  "э",
  "ю",
  "я",
];

export function meta({}: Route.MetaArgs) {
  return [{ title: "Letters" }];
}

export default function Letters() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pronunciations, setPronunciations] = useState<Pronunciation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const { acquireToken } = useAuth();

  const currentLetter = russianLetters[currentIndex];

  const handlePlayAudio = (index: number) => {
    const audio = audioRefs.current[index];
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadPronunciations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await acquireToken();
        const result = await fetchForvoPronunciations(currentLetter, token);
        if (isActive) {
          setPronunciations(sortPronunciations(result));
        }
      } catch (err) {
        console.debug("Could not acquire token or fetch pronunciations", err);
        if (isActive) {
          setError("Could not load pronunciations");
          setPronunciations([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadPronunciations();

    return () => {
      isActive = false;
    };
  }, [currentLetter, acquireToken]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < russianLetters.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const isAtFirstItem = currentIndex === 0;
  const isAtLastItem = currentIndex === russianLetters.length - 1;

  return (
    <Container size="md" className="pt-16 pb-16">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <div>
            <Title order={2}>Letters</Title>
            <Text mt="sm" c="dimmed">
              Practice pronunciation for Russian letters
            </Text>
          </div>
        </Group>

        {isLoading ? (
          <Paper p="lg" radius="md" withBorder>
            <Text>Loading pronunciations...</Text>
          </Paper>
        ) : error ? (
          <Paper p="lg" radius="md" withBorder>
            <Text c="red">{error}</Text>
          </Paper>
        ) : (
          <>
            <Paper p="xl" radius="md" withBorder bg="blue.0">
              <Text size="xl" fw={600} ta="center" style={{ lineHeight: 1.6 }}>
                {currentLetter}
              </Text>
            </Paper>

            <div>
              <Group justify="space-between" align="center" mb="md">
                <Text size="sm" c="dimmed" fw={500}>
                  Pronunciations ({pronunciations.length}):
                </Text>
              </Group>
              <Stack gap="sm">
                {pronunciations.length > 0 ? (
                  pronunciations.map((pronunciation: Pronunciation, index: number) => (
                    <Paper key={index} p="md" radius="md" withBorder bg="gray.0">
                      <Group gap="xl" align="center" wrap="nowrap">
                        <ActionIcon
                          size="xl"
                          radius="xl"
                          variant="filled"
                          color="blue"
                          onClick={() => handlePlayAudio(index)}
                        >
                          ▶
                        </ActionIcon>
                        <audio
                          ref={(el) => {
                            audioRefs.current[index] = el;
                          }}
                          style={{ display: "none" }}
                        >
                          <source src={pronunciation.audioMp3} type="audio/mpeg" />
                        </audio>
                        <Group gap="lg" wrap="nowrap" style={{ flex: 1 }}>
                          <div>
                            <Text size="xs" c="dimmed">Username</Text>
                            <Text size="sm" fw={500}>{pronunciation.username}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Gender</Text>
                            <Text size="sm" fw={500}>
                              {pronunciation.sex === 'm' ? 'Male' : pronunciation.sex === 'f' ? 'Female' : pronunciation.sex}
                            </Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Country</Text>
                            <Text size="sm" fw={500}>{pronunciation.country}</Text>
                          </div>
                        </Group>
                      </Group>
                    </Paper>
                  ))
                ) : (
                  <Paper p="md" radius="md" withBorder>
                    <Text c="dimmed">No pronunciations available</Text>
                  </Paper>
                )}
              </Stack>
            </div>

            <Group justify="space-between" mt="xl">
              <Button
                variant="subtle"
                onClick={handlePrevious}
                disabled={isAtFirstItem}
              >
                ← Previous
              </Button>
              <Text c="dimmed">
                {currentIndex + 1} / {russianLetters.length}
              </Text>
              <Button
                variant="subtle"
                onClick={handleNext}
                disabled={isAtLastItem}
              >
                Next →
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Container>
  );
}