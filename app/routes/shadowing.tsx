import type { Route } from "./+types/shadowing";
import { Container, Title, Text, Button, Paper, Group, Stack, TextInput, ActionIcon, Select, Textarea } from "@mantine/core";
import { useState, useEffect, useRef } from "react";
import { addShadowingEntry, fetchShadowingById, fetchShadowingCount, sortPronunciations, type ShadowingEntity, type Pronunciation } from "../api/api";
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
  const [replayGoal, setReplayGoal] = useState("");
  const [sentencesComplete, setSentencesComplete] = useState(0);
  const [goalReached, setGoalReached] = useState(false);
  const [viewMode, setViewMode] = useState<"view" | "add">("view");
  const [newSentence, setNewSentence] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shownRandomIds, setShownRandomIds] = useState<Set<number>>(new Set());
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const loadedEntityRef = useRef<string | null>(null);

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
  }, []);

  // Reset play count when navigating to a different item
  useEffect(() => {
    setPlayCount(0);
    setGoalReached(false);
  }, [currentRowId]);

  // Increment sentences complete when replay goal is hit on current card
  useEffect(() => {
    const goalNumber = parseInt(replayGoal, 10);
    if (!goalReached && goalNumber > 0 && playCount >= goalNumber) {
      setSentencesComplete(prev => prev + 1);
      setGoalReached(true);
    }
  }, [playCount, replayGoal, goalReached]);

  // Load entity when currentRowId changes
  useEffect(() => {
    if (viewMode !== "view") return;

    // Skip if we've already loaded this entity
    if (loadedEntityRef.current === currentRowId) return;

    const loadEntity = async () => {
      setEntityLoading(true);
      setError(null);
      try {
        const token = await acquireToken();
        const entity = await fetchShadowingById(currentRowId, token);
        if (entity) {
          // Sort pronunciations by country (Russia first) and gender (Male first)
          if (entity.pronunciations) {
            entity.pronunciations = sortPronunciations(entity.pronunciations);
          }
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

    loadedEntityRef.current = currentRowId;
    loadEntity();
  }, [currentRowId, viewMode, acquireToken]);

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

  const handleRandom = () => {
    if (totalItems && totalItems > 0) {
      // If all items have been shown, reset the tracking
      if (shownRandomIds.size >= totalItems) {
        setShownRandomIds(new Set());
      }

      // Get available IDs (not yet shown)
      const availableIds: number[] = [];
      for (let i = 1; i <= totalItems; i++) {
        if (!shownRandomIds.has(i)) {
          availableIds.push(i);
        }
      }

      // If no available IDs (shouldn't happen due to reset above), reset and try again
      if (availableIds.length === 0) {
        setShownRandomIds(new Set());
        const randomId = Math.floor(Math.random() * totalItems) + 1;
        setShownRandomIds(new Set([randomId]));
        setCurrentRowId(String(randomId));
        return;
      }

      // Pick a random ID from available ones
      const randomIndex = Math.floor(Math.random() * availableIds.length);
      const randomId = availableIds[randomIndex];
      
      // Add to shown set
      setShownRandomIds(prev => new Set([...prev, randomId]));
      setCurrentRowId(String(randomId));
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

  const handleAddSubmit = async () => {
    if (!newSentence.trim()) {
      setSubmitError("Sentence is required");
      setSubmitSuccess(null);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const token = await acquireToken();
      const result = await addShadowingEntry(newSentence.trim(), newDifficulty, token);

      if (!result) {
        setSubmitError("Could not add sentence");
        return;
      }

      setSubmitSuccess("Sentence added successfully");
      setNewSentence("");
      setNewDifficulty("easy");
      setTotalItems(prev => (prev !== null ? prev + 1 : prev));
    } catch (err) {
      console.debug("Could not acquire token or add sentence", err);
      setSubmitError("Could not add sentence");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container size="md" className="pt-16 pb-16">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <div>
            <Title order={2}>Shadowing</Title>
            <Text mt="sm" c="dimmed">
              Practice pronunciation with native speakers
            </Text>
          </div>
          <Group gap="sm" wrap="nowrap" align="flex-end">
            <Button
              variant={viewMode === "view" ? "filled" : "light"}
              onClick={() => setViewMode("view")}
            >
              View all
            </Button>
            <Button
              variant={viewMode === "add" ? "filled" : "light"}
              onClick={() => setViewMode("add")}
            >
              Add new
            </Button>
            {viewMode === "view" && (
              <Group gap="xs" wrap="nowrap" align="flex-end">
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
                <Button onClick={handleRandom} variant="outline" size="sm">
                  Random
                </Button>
              </Group>
            )}
          </Group>
        </Group>

        {viewMode === "add" ? (
          <Paper p="lg" radius="md" withBorder>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddSubmit();
              }}
            >
              <Stack gap="md">
                <Title order={3}>Add a new sentence</Title>
                <Textarea
                  label="Sentence"
                  placeholder="Enter the sentence"
                  value={newSentence}
                  onChange={(e) => setNewSentence(e.currentTarget.value)}
                  minRows={3}
                  required
                />
                <Select
                  label="Difficulty"
                  data={[
                    { value: "easy", label: "Easy" },
                    { value: "medium", label: "Medium" },
                    { value: "hard", label: "Hard" },
                  ]}
                  value={newDifficulty}
                  onChange={(value) => value && setNewDifficulty(value as "easy" | "medium" | "hard")}
                  required
                />
                {submitError && (
                  <Text c="red">{submitError}</Text>
                )}
                {submitSuccess && (
                  <Text c="green">{submitSuccess}</Text>
                )}
                <Group justify="flex-start">
                  <Button type="submit" loading={isSubmitting}>
                    Add sentence
                  </Button>
                </Group>
              </Stack>
            </form>
          </Paper>
        ) : entityLoading ? (
          <Paper p="lg" radius="md" withBorder>
            <Text>Loading item...</Text>
          </Paper>
        ) : error ? (
          <Paper p="lg" radius="md" withBorder>
            <Text c="red">{error}</Text>
          </Paper>
        ) : currentEntity ? (
          <>
            <Paper p="xl" radius="md" withBorder bg="blue.0">
              <Text size="xl" fw={600} ta="center" style={{ lineHeight: 1.6 }}>
                {currentEntity.entity.Sentence}
              </Text>
            </Paper>

            <div>
              <Group justify="space-between" align="center" mb="xs">
                <Group gap="sm" align="center" wrap="nowrap">
                  <Text size="sm" c="dimmed" fw={500}>Replay goal</Text>
                  <TextInput
                    placeholder="e.g. 10"
                    value={replayGoal}
                    onChange={(e) => setReplayGoal(e.currentTarget.value)}
                    size="sm"
                    w={120}
                    type="number"
                    min={1}
                  />
                </Group>
                <Text size="sm" fw={600}>Sentences complete: {sentencesComplete}</Text>
              </Group>

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
