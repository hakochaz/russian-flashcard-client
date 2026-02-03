import type { Route } from "./+types/forvo-word-search";
import { Container, Title, Text, Paper, Group, Stack, ActionIcon, Button, TextInput } from "@mantine/core";
import { useState, useRef } from "react";
import { fetchForvoPronunciations, sortPronunciations, type Pronunciation } from "../api/api";
import { useAuth } from "../auth/AuthProvider";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Forvo Word Search" }];
}

export default function ForvoWordSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [pronunciations, setPronunciations] = useState<Pronunciation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const { acquireToken } = useAuth();

  const handlePlayAudio = (index: number) => {
    const audio = audioRefs.current[index];
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    setPronunciations([]);

    try {
      const token = await acquireToken();
      const result = await fetchForvoPronunciations(query, token);
      setPronunciations(sortPronunciations(result));
    } catch (err) {
      console.debug("Could not acquire token or fetch pronunciations", err);
      setError("Could not load pronunciations");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Container size="md" className="pt-16 pb-16">
      <Stack gap="lg">
        <div>
          <Title order={2}>Forvo Word Search</Title>
          <Text mt="sm" c="dimmed">
            Search for a single Russian word with native speaker pronunciations
          </Text>
        </div>

        <Group gap="sm">
          <TextInput
            placeholder="Enter a word to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyPress={(e) => {
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

        {hasSearched && !isSearching && pronunciations.length === 0 && !error && (
          <Paper p="lg" radius="md" withBorder>
            <Text c="dimmed">No results found for "{searchQuery}"</Text>
          </Paper>
        )}

        {error && (
          <Paper p="lg" radius="md" withBorder>
            <Text c="red">{error}</Text>
          </Paper>
        )}

        {pronunciations.length > 0 && (
          <>
            <Paper p="xl" radius="md" withBorder bg="blue.0">
              <Text size="xl" fw={600} ta="center" style={{ lineHeight: 1.6 }}>
                {searchQuery.trim()}
              </Text>
            </Paper>

            <div>
              <Group justify="space-between" align="center" mb="md">
                <Text size="sm" c="dimmed" fw={500}>
                  Pronunciations ({pronunciations.length}):
                </Text>
              </Group>
              <Stack gap="sm">
                {pronunciations.map((pronunciation: Pronunciation, index: number) => (
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
            </div>
          </>
        )}
      </Stack>
    </Container>
  );
}