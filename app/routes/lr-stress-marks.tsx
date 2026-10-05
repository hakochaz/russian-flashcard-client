import type { Route } from "./+types/lr-stress-marks";
import { Container, Title, Text, Button, Paper, Group, Stack, Alert, Progress, Loader, SimpleGrid } from "@mantine/core";
import { useState, useEffect, useCallback } from "react";
import { isAnkiConnectAvailable, findNotes, notesInfo, updateNoteFields } from "../api/anki";
import { getStressedSentence } from "../api/api";
import { useAuth } from "../auth/AuthProvider";

export function meta({}: Route.MetaArgs) {
  return [{ title: "LR Russian Stress Marks" }];
}

const DECK_QUERY = 'deck:"Language Reactor"';
const SUBTITLE_FIELD = "Subtitle";
const SENTENCE_STRESS_FIELD = "Sentence Stress";
const CONCURRENCY = 6;

interface PendingNote {
  noteId: number;
  subtitle: string;
}

interface FailedNote extends PendingNote {
  error: string;
}

interface ScanResult {
  total: number;
  processed: number;
  pending: PendingNote[];
}

// Anki field values are HTML; reduce to plain text so "<br>" or "&nbsp;" count as empty
function fieldToText(html: string | undefined): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/ /g, " ").trim();
}

async function scanDeck(): Promise<ScanResult> {
  const noteIds = await findNotes(DECK_QUERY);
  const notes = await notesInfo(noteIds);

  let processed = 0;
  const pending: PendingNote[] = [];
  for (const note of notes) {
    const subtitle = fieldToText(note.fields[SUBTITLE_FIELD]?.value);
    const sentenceStress = fieldToText(note.fields[SENTENCE_STRESS_FIELD]?.value);
    if (sentenceStress) {
      processed++;
    } else if (subtitle && note.fields[SENTENCE_STRESS_FIELD]) {
      pending.push({ noteId: note.noteId, subtitle });
    }
  }

  return { total: notes.length, processed, pending };
}

export default function LrStressMarks() {
  const [ankiAvailable, setAnkiAvailable] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastRun, setLastRun] = useState<{ succeeded: number; failed: FailedNote[] } | null>(null);

  const { acquireToken } = useAuth();

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
    } catch (error) {
      setScanError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    checkAndScan();
  }, [checkAndScan]);

  const processNotes = async (notes: PendingNote[]) => {
    if (notes.length === 0) return;
    setIsProcessing(true);
    setLastRun(null);
    setProgress({ done: 0, total: notes.length });

    let succeeded = 0;
    const failed: FailedNote[] = [];
    let nextIndex = 0;

    const processOne = async (note: PendingNote) => {
      try {
        const token = await acquireToken();
        const stressed = await getStressedSentence(note.subtitle, token);
        if (!stressed) throw new Error("Stress API returned no result");
        // Only Sentence Stress is written; Subtitle and all other fields are untouched
        await updateNoteFields(note.noteId, { [SENTENCE_STRESS_FIELD]: stressed });
        succeeded++;
      } catch (error) {
        failed.push({ ...note, error: error instanceof Error ? error.message : String(error) });
      } finally {
        setProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }
    };

    const worker = async () => {
      while (nextIndex < notes.length) {
        const note = notes[nextIndex++];
        await processOne(note);
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, notes.length) }, worker));

    setLastRun({ succeeded, failed });
    setIsProcessing(false);
    await checkAndScan();
  };

  const pendingCount = scan?.pending.length ?? 0;

  return (
    <Container size="md">
      <Stack gap="lg">
        <div>
          <Text size="xs" tt="uppercase" fw={600} c="dimmed" className="tracking-wider">Anki Tools</Text>
          <Title order={2}>LR Russian Stress Marks</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Adds stress marks to the Sentence Stress field of Language Reactor notes, based on their Subtitle.
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
          <Alert color="red" title="Failed to scan Language Reactor deck">
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
            <Text size="sm" c="dimmed">Scanning Language Reactor deck...</Text>
          </Group>
        )}

        {scan && (
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Paper withBorder p="md" radius="md">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Total notes</Text>
              <Text size="xl" fw={700}>{scan.total}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Already processed</Text>
              <Text size="xl" fw={700} c="green">{scan.processed}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Missing sentence stress</Text>
              <Text size="xl" fw={700} c={pendingCount > 0 ? "orange" : undefined}>{pendingCount}</Text>
            </Paper>
          </SimpleGrid>
        )}

        {isProcessing && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="xs">
              <Text size="sm" fw={500}>Adding stress marks...</Text>
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} animated />
              <Text size="sm" c="dimmed">{progress.done} / {progress.total}</Text>
            </Stack>
          </Paper>
        )}

        {lastRun && !isProcessing && (
          <Alert color={lastRun.failed.length > 0 ? "orange" : "green"} title="Processing complete">
            <Stack gap="sm">
              <Text size="sm">{lastRun.succeeded} notes updated successfully</Text>
              {lastRun.failed.length > 0 && (
                <>
                  <Text size="sm">{lastRun.failed.length} failed</Text>
                  <Stack gap={2}>
                    {lastRun.failed.slice(0, 10).map(f => (
                      <Text key={f.noteId} size="xs" c="dimmed">
                        {f.subtitle} — {f.error}
                      </Text>
                    ))}
                    {lastRun.failed.length > 10 && (
                      <Text size="xs" c="dimmed">...and {lastRun.failed.length - 10} more</Text>
                    )}
                  </Stack>
                  <Group>
                    <Button size="xs" variant="light" color="orange" onClick={() => processNotes(lastRun.failed)}>
                      Retry Failed
                    </Button>
                  </Group>
                </>
              )}
            </Stack>
          </Alert>
        )}

        {scan && !isProcessing && (
          pendingCount > 0 ? (
            <Group>
              <Button onClick={() => processNotes(scan.pending)} disabled={isScanning}>
                Add Stress Marks to {pendingCount} {pendingCount === 1 ? "Note" : "Notes"}
              </Button>
            </Group>
          ) : (
            <Alert color="green">All Language Reactor notes have sentence stress marks.</Alert>
          )
        )}
      </Stack>
    </Container>
  );
}
