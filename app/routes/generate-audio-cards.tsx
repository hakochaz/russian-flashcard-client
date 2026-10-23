import type { Route } from "./+types/generate-audio-cards";
import { Container, Title, Text, Button, Paper, Group, Stack, Alert, Progress, Loader, SimpleGrid } from "@mantine/core";
import { useState, useEffect, useCallback, useRef } from "react";
import { isAnkiConnectAvailable, findNotes, notesInfo, addNote, addTags, retrieveMediaFile } from "../api/anki";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Generate Audio Cards" }];
}

// Grammar cards use a different note type, so filtering on Sentence Card excludes them
const SOURCE_QUERY = 'deck:"Master Deck::Russian Deck" note:"Sentence Card"';
const TARGET_DECK = "Master Deck::Audio Cards";
const TARGET_MODEL = "Audio Card";
const WORD_FIELD = "Word";
const CONTEXT_FIELD = "Context";
const AUDIO_FIELD = "Context Audio";
// Added to the source Sentence Card so it is never reviewed again
const CREATED_TAG = "audio-card-created";
const SKIPPED_TAG = "audio-card-skipped";
// Notes are loaded in batches since the deck holds thousands of sentence cards
const BATCH_SIZE = 25;
// Load the next batch once the review gets this close to the end of the loaded notes
const LOAD_MORE_THRESHOLD = 5;
// How many notes ahead of the current one to fetch audio for
const PREFETCH_AHEAD = 2;

interface PendingNote {
  noteId: number;
  word: string;
  context: string;
  audioFilename: string | null;
  // Copied verbatim to the new Audio Card, which has the same fields as a Sentence Card
  fields: Record<string, string>;
}

interface ScanResult {
  total: number;
  created: number;
  skipped: number;
  pendingIds: number[];
}

type AudioState =
  | { state: "loading" }
  | { state: "done"; src: string }
  | { state: "error"; error: string };

interface FailedApply {
  note: PendingNote;
  error: string;
}

// Anki field values are HTML; reduce to plain text for display
function fieldToText(html: string | undefined): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/ /g, " ").trim();
}

async function scanDeck(): Promise<ScanResult> {
  const [allIds, createdIds, skippedIds, pendingIds] = await Promise.all([
    findNotes(SOURCE_QUERY),
    findNotes(`${SOURCE_QUERY} tag:${CREATED_TAG}`),
    findNotes(`${SOURCE_QUERY} tag:${SKIPPED_TAG}`),
    // Notes without audio can't make an audio card
    findNotes(`${SOURCE_QUERY} -tag:${CREATED_TAG} -tag:${SKIPPED_TAG} "${AUDIO_FIELD}:_*"`),
  ]);
  // Note IDs are creation timestamps, so this reviews oldest notes first
  pendingIds.sort((a, b) => a - b);
  return { total: allIds.length, created: createdIds.length, skipped: skippedIds.length, pendingIds };
}

async function loadNotes(noteIds: number[]): Promise<PendingNote[]> {
  const notes = await notesInfo(noteIds);
  return notes.map(note => {
    const fields = Object.fromEntries(Object.entries(note.fields).map(([name, field]) => [name, field.value]));
    return {
      noteId: note.noteId,
      word: fieldToText(fields[WORD_FIELD]),
      context: fieldToText(fields[CONTEXT_FIELD]),
      audioFilename: fields[AUDIO_FIELD]?.match(/\[sound:(.+?)\]/)?.[1] ?? null,
      fields,
    };
  });
}

export default function GenerateAudioCards() {
  const [ankiAvailable, setAnkiAvailable] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [notes, setNotes] = useState<PendingNote[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [audio, setAudio] = useState<Record<number, AudioState>>({});
  const requested = useRef(new Set<number>());
  const [applying, setApplying] = useState(0);
  const [stats, setStats] = useState({ created: 0, skipped: 0 });
  const [failed, setFailed] = useState<FailedApply[]>([]);

  const checkAndScan = useCallback(async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      const available = await isAnkiConnectAvailable();
      setAnkiAvailable(available);
      if (!available) {
        setScan(null);
        return;
      }
      setScan(await scanDeck());
      setNotes([]);
      setIndex(0);
      setAudio({});
      setLoadError(null);
      requested.current.clear();
    } catch (error) {
      setScanError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    checkAndScan();
  }, [checkAndScan]);

  const pendingIds = scan?.pendingIds ?? [];
  const hasMore = notes.length < pendingIds.length;

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    setLoadError(null);
    try {
      const batch = await loadNotes(pendingIds.slice(notes.length, notes.length + BATCH_SIZE));
      setNotes(prev => [...prev, ...batch]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingMore(false);
    }
  }, [pendingIds, notes.length]);

  // Loads the next batch as the review nears the end of the loaded notes
  useEffect(() => {
    if (!hasMore || isLoadingMore || loadError) return;
    if (notes.length - index <= LOAD_MORE_THRESHOLD) loadMore();
  }, [hasMore, isLoadingMore, loadError, notes.length, index, loadMore]);

  const requestAudio = useCallback(async (note: PendingNote) => {
    requested.current.add(note.noteId);
    setAudio(prev => ({ ...prev, [note.noteId]: { state: "loading" } }));
    try {
      if (!note.audioFilename) throw new Error("No [sound:...] reference in the Context Audio field");
      const data = await retrieveMediaFile(note.audioFilename);
      if (data === false) throw new Error(`${note.audioFilename} not found in Anki media`);
      setAudio(prev => ({ ...prev, [note.noteId]: { state: "done", src: `data:audio/mpeg;base64,${data}` } }));
    } catch (error) {
      setAudio(prev => ({ ...prev, [note.noteId]: { state: "error", error: error instanceof Error ? error.message : String(error) } }));
    }
  }, []);

  // Only the current note and the next few have audio fetched, so media requests track review progress
  useEffect(() => {
    for (const note of notes.slice(index, index + PREFETCH_AHEAD + 1)) {
      if (!requested.current.has(note.noteId)) requestAudio(note);
    }
  }, [notes, index, requestAudio]);

  const applyDecision = async (note: PendingNote, create: boolean) => {
    setApplying(n => n + 1);
    try {
      if (create) {
        await addNote(TARGET_DECK, TARGET_MODEL, note.fields);
        await addTags([note.noteId], CREATED_TAG);
        setStats(s => ({ ...s, created: s.created + 1 }));
      } else {
        await addTags([note.noteId], SKIPPED_TAG);
        setStats(s => ({ ...s, skipped: s.skipped + 1 }));
      }
    } catch (error) {
      // Failed notes are not tagged, so they show up again on the next scan
      setFailed(prev => [...prev, { note, error: error instanceof Error ? error.message : String(error) }]);
    } finally {
      setApplying(n => n - 1);
    }
  };

  const current = notes[index] as PendingNote | undefined;
  const currentAudio = current ? audio[current.noteId] : undefined;

  // Applied in the background so the user can move straight on to the next note
  const decide = (create: boolean) => {
    if (!current) return;
    applyDecision(current, create);
    setIndex(i => i + 1);
  };

  const reviewed = stats.created + stats.skipped;
  const isFinished = scan && !current && !hasMore;

  return (
    <Container size="md">
      <Stack gap="lg">
        <div>
          <Text size="xs" tt="uppercase" fw={600} c="dimmed" className="tracking-wider">Anki Tools</Text>
          <Title order={2}>Generate Audio Cards</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Steps through Sentence Cards in <code>Master Deck::Russian Deck</code> one at a time. Creating copies the note's
            fields into a new <code>{TARGET_MODEL}</code> note in <code>{TARGET_DECK}</code>. The source note is tagged{" "}
            <code>{CREATED_TAG}</code> or <code>{SKIPPED_TAG}</code> so it is not shown again.
          </Text>
        </div>

        {ankiAvailable === false && (
          <Alert color="red" title="AnkiConnect not available">
            <Stack gap="sm">
              <Text size="sm">Could not reach AnkiConnect at localhost:8765. Make sure Anki is running with the AnkiConnect add-on installed.</Text>
              <Group>
                <Button size="xs" variant="light" color="red" onClick={checkAndScan} loading={isScanning}>Try Again</Button>
              </Group>
            </Stack>
          </Alert>
        )}

        {scanError && (
          <Alert color="red" title="Failed to scan Russian Deck">
            <Stack gap="sm">
              <Text size="sm">{scanError}</Text>
              <Group>
                <Button size="xs" variant="light" color="red" onClick={checkAndScan} loading={isScanning}>Try Again</Button>
              </Group>
            </Stack>
          </Alert>
        )}

        {isScanning && !scan && (
          <Group gap="sm">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Scanning Russian Deck...</Text>
          </Group>
        )}

        {scan && (
          <SimpleGrid cols={{ base: 1, sm: 4 }}>
            <Paper withBorder p="md" radius="md">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Sentence cards</Text>
              <Text size="xl" fw={700}>{scan.total}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Audio cards created</Text>
              <Text size="xl" fw={700} c="green">{scan.created}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Skipped</Text>
              <Text size="xl" fw={700}>{scan.skipped}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">To review</Text>
              <Text size="xl" fw={700} c={pendingIds.length > 0 ? "orange" : undefined}>{pendingIds.length}</Text>
            </Paper>
          </SimpleGrid>
        )}

        {scan && pendingIds.length > 0 && (
          <Stack gap={4}>
            <Progress value={(index / pendingIds.length) * 100} />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{Math.min(index + 1, pendingIds.length)} / {pendingIds.length}</Text>
              <Text size="sm" c="dimmed">
                {stats.created} created · {stats.skipped} skipped
                {applying > 0 && ` · saving ${applying}...`}
              </Text>
            </Group>
          </Stack>
        )}

        {failed.length > 0 && (
          <Alert color="orange" title={`${failed.length} ${failed.length === 1 ? "note" : "notes"} failed to save`}>
            <Stack gap="sm">
              <Stack gap={2}>
                {failed.slice(0, 10).map(f => (
                  <Text key={f.note.noteId} size="xs" c="dimmed">
                    {f.note.context} — {f.error}
                  </Text>
                ))}
                {failed.length > 10 && (
                  <Text size="xs" c="dimmed">...and {failed.length - 10} more</Text>
                )}
              </Stack>
              <Text size="xs" c="dimmed">These notes were not tagged and will appear again on the next scan.</Text>
            </Stack>
          </Alert>
        )}

        {loadError && (
          <Alert color="red" title="Failed to load notes">
            <Stack gap="sm">
              <Text size="sm">{loadError}</Text>
              <Group>
                <Button size="xs" variant="light" color="red" onClick={loadMore} loading={isLoadingMore}>Retry</Button>
              </Group>
            </Stack>
          </Alert>
        )}

        {current && (
          <Stack gap="md">
            <Paper withBorder p="md" radius="md">
              <Stack gap={6}>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed">{current.word}</Text>
                <Text size="lg">{current.context}</Text>
                {(!currentAudio || currentAudio.state === "loading") && (
                  <Group gap="sm">
                    <Loader size="xs" />
                    <Text size="sm" c="dimmed">Loading audio...</Text>
                  </Group>
                )}
                {currentAudio?.state === "done" && (
                  <audio key={current.noteId} controls src={currentAudio.src} style={{ width: "100%" }} />
                )}
                {currentAudio?.state === "error" && (
                  <Group gap="sm">
                    <Text size="sm" c="red">{currentAudio.error}</Text>
                    <Button size="xs" variant="light" color="red" onClick={() => requestAudio(current)}>Retry</Button>
                  </Group>
                )}
              </Stack>
            </Paper>
            <Group>
              <Button color="green" onClick={() => decide(true)}>Create Audio Card</Button>
              <Button variant="default" onClick={() => decide(false)}>Skip</Button>
            </Group>
          </Stack>
        )}

        {scan && !current && hasMore && !loadError && (
          <Group gap="sm">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading notes...</Text>
          </Group>
        )}

        {isFinished && (
          pendingIds.length > 0 ? (
            <Alert color={failed.length > 0 ? "orange" : "green"} title="Review complete">
              <Stack gap="sm">
                <Text size="sm">
                  Reviewed {reviewed} {reviewed === 1 ? "note" : "notes"}.
                  {applying > 0 && ` Saving ${applying} more...`}
                </Text>
                <Group>
                  <Button size="xs" variant="light" onClick={checkAndScan} loading={isScanning} disabled={applying > 0}>Rescan Deck</Button>
                </Group>
              </Stack>
            </Alert>
          ) : (
            <Alert color="green">No unreviewed Sentence Cards with audio.</Alert>
          )
        )}
      </Stack>
    </Container>
  );
}
