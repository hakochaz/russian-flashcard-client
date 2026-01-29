import type { Route } from "./+types/minimal-pairs";
import {
  Container,
  Title,
  Text,
  Button,
  Paper,
  Group,
  Stack,
  TextInput,
  ActionIcon,
  Select,
  SimpleGrid,
} from "@mantine/core";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  addMinimalPairEntry,
  fetchMinimalPairById,
  fetchMinimalPairsCount,
  type MinimalPairsEntity,
  type Pronunciation,
} from "../api/api";
import { useAuth } from "../auth/AuthProvider";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Minimal Pairs" }];
}

const splitPair = (pair: string) => {
  const parts = pair.split("/");
  const left = (parts[0] || "").trim();
  const right = parts.slice(1).join("/").trim();
  return [left, right] as const;
};

export default function MinimalPairs() {
  const [currentRowId, setCurrentRowId] = useState("1");
  const [entityLoading, setEntityLoading] = useState(false);
  const [currentEntity, setCurrentEntity] = useState<MinimalPairsEntity | null>(null);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goToItemInput, setGoToItemInput] = useState("");
  const [viewMode, setViewMode] = useState<"view" | "add">("view");
  const [newWord1, setNewWord1] = useState("");
  const [newWord2, setNewWord2] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const leftAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const rightAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const { acquireToken } = useAuth();

  useEffect(() => {
    const loadItemCount = async () => {
      try {
        const token = await acquireToken();
        const count = await fetchMinimalPairsCount(token);
        setTotalItems(count);
      } catch (err) {
        console.debug("Could not acquire token for minimal pairs count", err);
      }
    };

    loadItemCount();
  }, [acquireToken]);

  useEffect(() => {
    if (viewMode !== "view") return;

    const loadEntity = async () => {
      setEntityLoading(true);
      setError(null);
      try {
        const token = await acquireToken();
        const entity = await fetchMinimalPairById(currentRowId, token);
        if (entity) {
          setCurrentEntity(entity);
        } else {
          setError("Item not found");
          setCurrentEntity(null);
        }
      } catch (err) {
        console.debug("Could not acquire token or fetch minimal pair", err);
      } finally {
        setEntityLoading(false);
      }
    };

    loadEntity();
  }, [currentRowId, acquireToken, viewMode]);

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
      const randomId = Math.floor(Math.random() * totalItems) + 1;
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

  const handlePlayAudio = (refs: MutableRefObject<(HTMLAudioElement | null)[]>, index: number) => {
    const audio = refs.current[index];
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
  };

  const handleAddSubmit = async () => {
    const word1 = newWord1.trim();
    const word2 = newWord2.trim();
    if (!word1 || !word2) {
      setSubmitError("Both words are required");
      setSubmitSuccess(null);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const token = await acquireToken();
      const pair = `${word1}/${word2}`;
      const result = await addMinimalPairEntry(pair, newDifficulty, token);

      if (!result) {
        setSubmitError("Could not add minimal pair");
        return;
      }

      setSubmitSuccess("Minimal pair added successfully");
      setNewWord1("");
      setNewWord2("");
      setNewDifficulty("easy");
      setTotalItems(prev => (prev !== null ? prev + 1 : prev));
    } catch (err) {
      console.debug("Could not acquire token or add minimal pair", err);
      setSubmitError("Could not add minimal pair");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPronunciations = (
    pronunciations: Pronunciation[] | undefined,
    refs: MutableRefObject<(HTMLAudioElement | null)[]>
  ) => {
    if (!pronunciations || pronunciations.length === 0) {
      return (
        <Paper p="md" radius="md" withBorder>
          <Text c="dimmed">No pronunciations available</Text>
        </Paper>
      );
    }

    return (
      <Stack gap="sm">
        {pronunciations.map((pronunciation: Pronunciation, index: number) => (
          <Paper key={index} p="md" radius="md" withBorder bg="gray.0">
            <Group gap="xl" align="center" wrap="nowrap">
              <ActionIcon
                size="xl"
                radius="xl"
                variant="filled"
                color="blue"
                onClick={() => handlePlayAudio(refs, index)}
              >
                ▶
              </ActionIcon>
              <audio
                ref={(el) => {
                  refs.current[index] = el;
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
                    {pronunciation.sex === "m" ? "Male" : pronunciation.sex === "f" ? "Female" : pronunciation.sex}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Country</Text>
                  <Text size="sm" fw={500}>{pronunciation.country}</Text>
                </div>
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>
    );
  };

  const renderAlignedPronunciations = () => {
    if (!currentEntity?.pronunciations1 || !currentEntity?.pronunciations2) return null;

    const left = currentEntity.pronunciations1;
    const right = currentEntity.pronunciations2;

    // Create maps of username to index
    const leftByUsername = new Map(left.map((p, i) => [p.username, i]));
    const rightByUsername = new Map(right.map((p, i) => [p.username, i]));

    // Find common usernames
    const commonUsernames = Array.from(leftByUsername.keys()).filter(u => rightByUsername.has(u));
    const leftOnlyIndices = left.map((_, i) => i).filter(i => !commonUsernames.includes(left[i].username));
    const rightOnlyIndices = right.map((_, i) => i).filter(i => !commonUsernames.includes(right[i].username));

    return (
      <Stack gap="lg">
        {/* Matched pairs */}
        {commonUsernames.length > 0 && (
          <div>
            <Text size="sm" c="dimmed" fw={500} mb="xs">
              Matching speakers
            </Text>
            <Stack gap="sm">
              {commonUsernames.map((username) => {
                const leftIdx = leftByUsername.get(username)!;
                const rightIdx = rightByUsername.get(username)!;
                const leftPron = left[leftIdx];
                const rightPron = right[rightIdx];

                return (
                  <SimpleGrid key={username} cols={2} spacing="sm">
                    <Paper p="md" radius="md" withBorder bg="gray.0">
                      <Group gap="xl" align="center" wrap="nowrap">
                        <ActionIcon
                          size="xl"
                          radius="xl"
                          variant="filled"
                          color="blue"
                          onClick={() => handlePlayAudio(leftAudioRefs, leftIdx)}
                        >
                          ▶
                        </ActionIcon>
                        <audio
                          ref={(el) => {
                            leftAudioRefs.current[leftIdx] = el;
                          }}
                          style={{ display: "none" }}
                        >
                          <source src={leftPron.audioMp3} type="audio/mpeg" />
                        </audio>
                        <Group gap="lg" wrap="nowrap" style={{ flex: 1 }}>
                          <div>
                            <Text size="xs" c="dimmed">Username</Text>
                            <Text size="sm" fw={500}>{leftPron.username}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Gender</Text>
                            <Text size="sm" fw={500}>
                              {leftPron.sex === "m" ? "Male" : leftPron.sex === "f" ? "Female" : leftPron.sex}
                            </Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Country</Text>
                            <Text size="sm" fw={500}>{leftPron.country}</Text>
                          </div>
                        </Group>
                      </Group>
                    </Paper>
                    <Paper p="md" radius="md" withBorder bg="gray.0">
                      <Group gap="xl" align="center" wrap="nowrap">
                        <ActionIcon
                          size="xl"
                          radius="xl"
                          variant="filled"
                          color="blue"
                          onClick={() => handlePlayAudio(rightAudioRefs, rightIdx)}
                        >
                          ▶
                        </ActionIcon>
                        <audio
                          ref={(el) => {
                            rightAudioRefs.current[rightIdx] = el;
                          }}
                          style={{ display: "none" }}
                        >
                          <source src={rightPron.audioMp3} type="audio/mpeg" />
                        </audio>
                        <Group gap="lg" wrap="nowrap" style={{ flex: 1 }}>
                          <div>
                            <Text size="xs" c="dimmed">Username</Text>
                            <Text size="sm" fw={500}>{rightPron.username}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Gender</Text>
                            <Text size="sm" fw={500}>
                              {rightPron.sex === "m" ? "Male" : rightPron.sex === "f" ? "Female" : rightPron.sex}
                            </Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">Country</Text>
                            <Text size="sm" fw={500}>{rightPron.country}</Text>
                          </div>
                        </Group>
                      </Group>
                    </Paper>
                  </SimpleGrid>
                );
              })}
            </Stack>
          </div>
        )}

        {/* Non-matching pronunciations */}
        {(leftOnlyIndices.length > 0 || rightOnlyIndices.length > 0) && (
          <div>
            <Text size="sm" c="dimmed" fw={500} mb="xs">
              Other speakers
            </Text>
            <SimpleGrid cols={2} spacing="lg">
              <div>
                {leftOnlyIndices.length > 0 && (
                  <Stack gap="sm">
                    {leftOnlyIndices.map((idx) => {
                      const pron = left[idx];
                      return (
                        <Paper key={idx} p="md" radius="md" withBorder bg="gray.0">
                          <Group gap="xl" align="center" wrap="nowrap">
                            <ActionIcon
                              size="xl"
                              radius="xl"
                              variant="filled"
                              color="blue"
                              onClick={() => handlePlayAudio(leftAudioRefs, idx)}
                            >
                              ▶
                            </ActionIcon>
                            <audio
                              ref={(el) => {
                                leftAudioRefs.current[idx] = el;
                              }}
                              style={{ display: "none" }}
                            >
                              <source src={pron.audioMp3} type="audio/mpeg" />
                            </audio>
                            <Group gap="lg" wrap="nowrap" style={{ flex: 1 }}>
                              <div>
                                <Text size="xs" c="dimmed">Username</Text>
                                <Text size="sm" fw={500}>{pron.username}</Text>
                              </div>
                              <div>
                                <Text size="xs" c="dimmed">Gender</Text>
                                <Text size="sm" fw={500}>
                                  {pron.sex === "m" ? "Male" : pron.sex === "f" ? "Female" : pron.sex}
                                </Text>
                              </div>
                              <div>
                                <Text size="xs" c="dimmed">Country</Text>
                                <Text size="sm" fw={500}>{pron.country}</Text>
                              </div>
                            </Group>
                          </Group>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </div>
              <div>
                {rightOnlyIndices.length > 0 && (
                  <Stack gap="sm">
                    {rightOnlyIndices.map((idx) => {
                      const pron = right[idx];
                      return (
                        <Paper key={idx} p="md" radius="md" withBorder bg="gray.0">
                          <Group gap="xl" align="center" wrap="nowrap">
                            <ActionIcon
                              size="xl"
                              radius="xl"
                              variant="filled"
                              color="blue"
                              onClick={() => handlePlayAudio(rightAudioRefs, idx)}
                            >
                              ▶
                            </ActionIcon>
                            <audio
                              ref={(el) => {
                                rightAudioRefs.current[idx] = el;
                              }}
                              style={{ display: "none" }}
                            >
                              <source src={pron.audioMp3} type="audio/mpeg" />
                            </audio>
                            <Group gap="lg" wrap="nowrap" style={{ flex: 1 }}>
                              <div>
                                <Text size="xs" c="dimmed">Username</Text>
                                <Text size="sm" fw={500}>{pron.username}</Text>
                              </div>
                              <div>
                                <Text size="xs" c="dimmed">Gender</Text>
                                <Text size="sm" fw={500}>
                                  {pron.sex === "m" ? "Male" : pron.sex === "f" ? "Female" : pron.sex}
                                </Text>
                              </div>
                              <div>
                                <Text size="xs" c="dimmed">Country</Text>
                                <Text size="sm" fw={500}>{pron.country}</Text>
                              </div>
                            </Group>
                          </Group>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </div>
            </SimpleGrid>
          </div>
        )}
      </Stack>
    );
  };

  const pairText = currentEntity?.entity?.Pair || "";
  const [leftText, rightText] = splitPair(pairText);

  return (
    <Container size="xl" className="pt-16 pb-16">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <div>
            <Title order={2}>Minimal Pairs</Title>
            <Text mt="sm" c="dimmed">
              Practice distinguishing similar sounds
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
                    if (e.key === "Enter") {
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
                <Title order={3}>Add a new minimal pair</Title>
                <SimpleGrid cols={2} spacing="md">
                  <TextInput
                    label="Word 1"
                    placeholder="Enter first word"
                    value={newWord1}
                    onChange={(e) => setNewWord1(e.currentTarget.value)}
                    required
                  />
                  <TextInput
                    label="Word 2"
                    placeholder="Enter second word"
                    value={newWord2}
                    onChange={(e) => setNewWord2(e.currentTarget.value)}
                    required
                  />
                </SimpleGrid>
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
                {submitError && <Text c="red">{submitError}</Text>}
                {submitSuccess && <Text c="green">{submitSuccess}</Text>}
                <Group justify="flex-start">
                  <Button type="submit" loading={isSubmitting}>
                    Add minimal pair
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
            <SimpleGrid cols={2} spacing="lg">
              <Paper p="xl" radius="md" withBorder bg="blue.0">
                <Text size="xl" fw={600} ta="center" style={{ lineHeight: 1.6 }}>
                  {leftText}
                </Text>
              </Paper>
              <Paper p="xl" radius="md" withBorder bg="blue.0">
                <Text size="xl" fw={600} ta="center" style={{ lineHeight: 1.6 }}>
                  {rightText}
                </Text>
              </Paper>
            </SimpleGrid>

            {renderAlignedPronunciations()}

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
