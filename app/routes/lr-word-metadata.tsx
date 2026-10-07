import type { Route } from "./+types/lr-word-metadata";
import { Container, Title, Text, Button, Paper, Group, Stack, Alert, Progress, Loader, SimpleGrid } from "@mantine/core";
import { useState, useEffect, useCallback } from "react";
import { isAnkiConnectAvailable, findNotes, notesInfo, updateNoteFields, addTags } from "../api/anki";
import { lexiconSearch } from "../api/api";
import { useAuth } from "../auth/AuthProvider";

export function meta({}: Route.MetaArgs) {
  return [{ title: "LR Word Metadata" }];
}

const DECK_QUERY = 'deck:"Language Reactor"';
const LEMMA_FIELD = "Lemma";
// Added to every note that has been looked up (matched or not), so it is never searched again
const CHECKED_TAG = "lr-lemma-checked";
const SOFT_SIGN = "ь";
const CONCURRENCY = 6;

interface PendingNote {
  noteId: number;
  lemma: string;
}

interface FailedNote extends PendingNote {
  error: string;
}

interface ScanResult {
  total: number;
  checked: number;
  pending: PendingNote[];
}

// Anki field values are HTML; reduce to plain text so "<br>" or "&nbsp;" count as empty
function fieldToText(html: string | undefined): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/ /g, " ").trim();
}

async function scanDeck(): Promise<ScanResult> {
  const [allIds, checkedIds, uncheckedIds] = await Promise.all([
    findNotes(DECK_QUERY),
    findNotes(`${DECK_QUERY} tag:${CHECKED_TAG}`),
    findNotes(`${DECK_QUERY} -tag:${CHECKED_TAG}`),
  ]);
  const notes = await notesInfo(uncheckedIds);

  const pending: PendingNote[] = [];
  for (const note of notes) {
    const lemma = fieldToText(note.fields[LEMMA_FIELD]?.value);
    if (lemma.endsWith(SOFT_SIGN)) {
      pending.push({ noteId: note.noteId, lemma });
    }
  }

  return { total: allIds.length, checked: checkedIds.length, pending };
}

export default function LrWordMetadata() {
  const [ankiAvailable, setAnkiAvailable] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastRun, setLastRun] = useState<{ updated: number; noMatch: number; failed: FailedNote[] } | null>(null);

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

    let updated = 0;
    let noMatch = 0;
    const failed: FailedNote[] = [];
    let nextIndex = 0;

    const processOne = async (note: PendingNote) => {
      try {
        const token = await acquireToken();
        const baseWord = await lexiconSearch(note.lemma, token);
        // No lexicon match leaves the Lemma as-is; the note is still tagged so it isn't retried
        if (baseWord) {
          await updateNoteFields(note.noteId, { [LEMMA_FIELD]: baseWord });
          updated++;
        } else {
          noMatch++;
        }
        await addTags([note.noteId], CHECKED_TAG);
      } catch (error) {
        // Errors are not tagged, so the note shows up again on the next scan
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

    setLastRun({ updated, noMatch, failed });
    setIsProcessing(false);
    await checkAndScan();
  };

  const pendingCount = scan?.pending.length ?? 0;

  return (
    <Container size="md">
      <Stack gap="lg">
        <div>
          <Text size="xs" tt="uppercase" fw={600} c="dimmed" className="tracking-wider">Anki Tools</Text>
          <Title order={2}>LR Word Metadata</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Replaces the Lemma of Language Reactor notes ending in ь with its lexicon entry (aspect pair or noun metadata),
            e.g. дарить → дарить/по- (+a +d). Checked notes are tagged <code>{CHECKED_TAG}</code> and skipped next time.
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
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Already checked</Text>
              <Text size="xl" fw={700} c="green">{scan.checked}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Lemmas to look up</Text>
              <Text size="xl" fw={700} c={pendingCount > 0 ? "orange" : undefined}>{pendingCount}</Text>
            </Paper>
          </SimpleGrid>
        )}

        {isProcessing && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="xs">
              <Text size="sm" fw={500}>Looking up lemmas...</Text>
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} animated />
              <Text size="sm" c="dimmed">{progress.done} / {progress.total}</Text>
            </Stack>
          </Paper>
        )}

        {lastRun && !isProcessing && (
          <Alert color={lastRun.failed.length > 0 ? "orange" : "green"} title="Processing complete">
            <Stack gap="sm">
              <Text size="sm">{lastRun.updated} lemmas updated, {lastRun.noMatch} had no lexicon match</Text>
              {lastRun.failed.length > 0 && (
                <>
                  <Text size="sm">{lastRun.failed.length} failed</Text>
                  <Stack gap={2}>
                    {lastRun.failed.slice(0, 10).map(f => (
                      <Text key={f.noteId} size="xs" c="dimmed">
                        {f.lemma} — {f.error}
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
                Look Up {pendingCount} {pendingCount === 1 ? "Lemma" : "Lemmas"}
              </Button>
            </Group>
          ) : (
            <Alert color="green">No unchecked Language Reactor lemmas ending in ь.</Alert>
          )
        )}
      </Stack>
    </Container>
  );
}
