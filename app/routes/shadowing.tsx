import type { Route } from "./+types/shadowing";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput, ActionIcon } from "@mantine/core";
import { useState, useEffect, useRef } from "react";
import { fetchShadowingById, fetchShadowingCount, type ShadowingEntity, type Pronunciation } from "../api/api";
import { useAuth } from "../auth/AuthProvider";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Shadowing" }];
}

export default function Shadowing() {
  const [currentRowId, setCurrentRowId] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [entityLoading, setEntityLoading] = useState(false);
  const [currentEntity, setCurrentEntity] = useState<ShadowingEntity | null>(null);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goToItemInput, setGoToItemInput] = useState("");
  const [playCount, setPlayCount] = useState(0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const { acquireToken } = useAuth();

  const handlePlayAudio = (index: number) => {
    const audio = audioRefs.current[index];
    if (audio) {
      audio.currentTime = 0;
      audio.play();
      setPlayCount(prev => prev + 1);
      setPlayingIndex(index);
    }
  };

  // Load total item count on mount
  useEffect(() => {
    const loadItemCount = async () => {
      try {
        const token = await acquireToken();
        const count = await fetchShadowingCount(token);
        setTotalItems(count);
      } catch (err) {
        console.debug("Could not acquire token for item count", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadItemCount();
  }, [acquireToken]);

  // Reset play count when navigating to a different item
  useEffect(() => {
    setPlayCount(0);
  }, [currentRowId]);

  // Load entity when currentRowId changes
  useEffect(() => {
    const loadEntity = async () => {
      setEntityLoading(true);
      setError(null);
      try {
        const token = await acquireToken();
        const entity = await fetchShadowingById(currentRowId, token);
        if (entity) {
          setCurrentEntity(entity);
        } else {
          setError("Item not found");
          setCurrentEntity(null);
        }
      } catch (err) {
        console.debug("Could not acquire token or fetch entity", err);
      } finally {
        setEntityLoading(false);
      }
    };

    loadEntity();
  }, [currentRowId, acquireToken]);

  const handlePrevious = () => {
    const prevId = parseInt(currentRowId) - 1;
    if (prevId >= 1) {
      setCurrentRowId(String(prevId));
    }
  };

  const handleNext = () => {
    if (!isAtLastItem) {
      const nextId = parseInt(currentRowId) + 1;
      setCurrentRowId(String(nextId));
    }
  };

  const isAtFirstItem = currentRowId === "1";
  const isAtLastItem = totalItems !== null && parseInt(currentRowId) === totalItems;

  const handleGoToItem = () => {
    const itemId = goToItemInput.trim();
    if (itemId && /^\d+$/.test(itemId)) {
      const itemNum = parseInt(itemId);
      if (totalItems === null || (itemNum >= 1 && itemNum <= totalItems)) {
        setCurrentRowId(itemId);
        setGoToItemInput("");
      }
    }
  };

  return (
    <Container size="md" className="pt-16 pb-16">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>Shadowing</Title>
            <Text mt="sm" c="dimmed">
              Practice pronunciation with native speakers
            </Text>
          </div>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              placeholder="Item No"
              value={goToItemInput}
              onChange={(e) => setGoToItemInput(e.currentTarget.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleGoToItem();
                }
              }}
              size="sm"
              w={80}
            />
            <Button onClick={handleGoToItem} variant="light" size="sm">
              Go
            </Button>
          </Group>
        </Group>

        {entityLoading ? (
          <Paper p="lg" radius="md" withBorder>
            <Text>Loading item...</Text>
          </Paper>
        ) : error ? (
          <Paper p="lg" radius="md" withBorder>
            <Text c="red">{error}</Text>
          </Paper>
        ) : currentEntity ? (
          <>
            {/* Sentence Display */}
            <Paper p="xl" radius="md" withBorder bg="blue.0">
              <Text size="xl" fw={600} ta="center" style={{ lineHeight: 1.6 }}>
                {currentEntity.entity.Sentence}
              </Text>
            </Paper>

            {/* Pronunciations List */}
            <div>
              <Group justify="space-between" align="center" mb="md">
                <Text size="sm" c="dimmed" fw={500}>
                  Pronunciations ({currentEntity.pronunciations?.length || 0}):
                </Text>
                <Text size="sm" c="dimmed" fw={500}>
                  Plays on this card: {playCount}
                </Text>
              </Group>
              <Stack gap="sm">
                {currentEntity.pronunciations && currentEntity.pronunciations.length > 0 ? (
                  currentEntity.pronunciations.map((pronunciation: Pronunciation, index: number) => (
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
                          ref={(el) => { audioRefs.current[index] = el; }}
                          onEnded={() => setPlayingIndex(null)}
                          style={{ display: 'none' }}
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

            {/* Navigation */}
            <Group justify="space-between" mt="xl">
              <Button
                variant="subtle"
                onClick={handlePrevious}
                disabled={isAtFirstItem}
              >
                ← Previous
              </Button>
              <Text c="dimmed">
                {currentRowId} / {totalItems || "?"}
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
        ) : (
          <Paper p="lg" radius="md" withBorder>
            <Text c="dimmed">No item loaded</Text>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
