import type { Route } from "./+types/lr-sentence-cleanup";
import { Container, Title, Text, Button, Paper, Group, Stack, Alert, Progress, Loader, SimpleGrid, Badge, Switch } from "@mantine/core";
import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { isAnkiConnectAvailable, findNotes, notesInfo, updateNoteFields, addTags, deleteNotes, storeMediaFileFromUrl } from "../api/anki";
import { trimCloze, synthesizeSentenceAudio, type TrimClozeResult } from "../api/api";
import { useAuth } from "../auth/AuthProvider";

export function meta({}: Route.MetaArgs) {
  return [{ title: "LR Sentence Clean Up" }];
}

const DECK_QUERY = 'deck:"Language Reactor"';
const CLOZE_FIELD = "Cloze";
const SUBTITLE_FIELD = "Subtitle";
const TRANSLATION_FIELD = "Translation";
const SENTENCE_STRESS_FIELD = "Sentence Stress";
const AUDIO_FIELD = "Audio Clip";
const SOURCE_FIELD = "Source";
// Added to every note the user has accepted (changed or not), so it is never reviewed again
const CHECKED_TAG = "lr-cloze-checked";
const CLOZE_MARKER = /\{\{c\d+::/;
// How many notes ahead of the current one to request trims for
const PREFETCH_AHEAD = 3;

interface PendingNote {
  noteId: number;
  cloze: string;
  subtitle: string;
  translation: string;
}

interface ScanResult {
  total: number;
  checked: number;
  pending: PendingNote[];
}

type TrimState =
  | { state: "loading" }
  | { state: "done"; result: TrimClozeResult }
  | { state: "error"; error: string };

interface FailedApply {
  note: PendingNote;
  error: string;
}

// Anki field values are HTML; reduce to plain text so "<br>" or "&nbsp;" count as empty
function fieldToText(html: string | undefined): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/ /g, " ").trim();
}

async function scanDeck(youtubeOnly: boolean): Promise<ScanResult> {
  const [allIds, checkedIds, uncheckedIds] = await Promise.all([
    findNotes(DECK_QUERY),
    findNotes(`${DECK_QUERY} tag:${CHECKED_TAG}`),
    findNotes(`${DECK_QUERY} -tag:${CHECKED_TAG}`),
  ]);
  const notes = await notesInfo(uncheckedIds);

  const pending: PendingNote[] = [];
  for (const note of notes) {
    const cloze = fieldToText(note.fields[CLOZE_FIELD]?.value);
    if (!CLOZE_MARKER.test(cloze)) continue;
    if (youtubeOnly && !/youtube/i.test(fieldToText(note.fields[SOURCE_FIELD]?.value))) continue;
    pending.push({
      noteId: note.noteId,
      cloze,
      subtitle: fieldToText(note.fields[SUBTITLE_FIELD]?.value),
      translation: fieldToText(note.fields[TRANSLATION_FIELD]?.value),
    });
  }

  return { total: allIds.length, checked: checkedIds.length, pending };
}

// Renders a cloze sentence with the {{cN::word::hint}} markers shown as highlighted words
function ClozeText({ cloze }: { cloze: string }) {
  const parts = cloze.split(/(\{\{c\d+::.*?\}\})/g);
  return (
    <Text size="lg">
      {parts.map((part, i) => {
        const match = part.match(/^\{\{c\d+::(.*?)(?:::.*)?\}\}$/);
        return match
          ? <Text key={i} span fw={700} c="blue">{match[1]}</Text>
          : <Fragment key={i}>{part}</Fragment>;
      })}
    </Text>
  );
}

function SentenceBlock({ label, cloze, translation, stress }: { label: string; cloze: string; translation: string | null; stress?: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap={6}>
        <Text size="xs" tt="uppercase" fw={600} c="dimmed">{label}</Text>
        <ClozeText cloze={cloze} />
        {stress && <Text size="sm" c="dimmed">{stress}</Text>}
        {translation
          ? <Text size="sm" fs="italic">{translation}</Text>
          : <Text size="sm" c="orange">Translation failed; the original translation will be kept.</Text>}
      </Stack>
    </Paper>
  );
}

export default function LrSentenceCleanup() {
  const [ankiAvailable, setAnkiAvailable] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [index, setIndex] = useState(0);
  const [trims, setTrims] = useState<Record<number, TrimState>>({});
  const requested = useRef(new Set<number>());
  const [applying, setApplying] = useState(0);
  const [stats, setStats] = useState({ unchanged: 0, changed: 0, deleted: 0, skipped: 0 });
  const [failed, setFailed] = useState<FailedApply[]>([]);
  const [youtubeOnly, setYoutubeOnly] = useState(true);

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
      setScan(await scanDeck(youtubeOnly));
      setIndex(0);
      setTrims({});
      requested.current.clear();
    } catch (error) {
      setScanError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsScanning(false);
    }
  }, [youtubeOnly]);

  // Rescans whenever the YouTube filter is toggled
  useEffect(() => {
    checkAndScan();
  }, [checkAndScan]);

  const requestTrim = useCallback(async (note: PendingNote) => {
    requested.current.add(note.noteId);
    setTrims(prev => ({ ...prev, [note.noteId]: { state: "loading" } }));
    try {
      const token = await acquireToken();
      const result = await trimCloze(note.cloze, token);
      setTrims(prev => ({ ...prev, [note.noteId]: { state: "done", result } }));
    } catch (error) {
      setTrims(prev => ({ ...prev, [note.noteId]: { state: "error", error: error instanceof Error ? error.message : String(error) } }));
    }
  }, [acquireToken]);

  // Only the current note and the next few are trimmed, so API calls track review progress
  useEffect(() => {
    if (!scan) return;
    for (const note of scan.pending.slice(index, index + PREFETCH_AHEAD + 1)) {
      if (!requested.current.has(note.noteId)) requestTrim(note);
    }
  }, [scan, index, requestTrim]);

  const applyDecision = async (note: PendingNote, result: TrimClozeResult) => {
    setApplying(n => n + 1);
    try {
      if (result.status === "insufficientContext") {
        await deleteNotes([note.noteId]);
        setStats(s => ({ ...s, deleted: s.deleted + 1 }));
      } else if (result.status === "changed") {
        // Audio is generated from the plain sentence; stress marks would affect pronunciation
        const token = await acquireToken();
        const audioUrl = await synthesizeSentenceAudio(result.sentence, token);
        if (!audioUrl) throw new Error("Audio synthesis returned no result");
        const filename = await storeMediaFileFromUrl(`lr-cloze-${note.noteId}-${Date.now()}.mp3`, audioUrl);
        await updateNoteFields(note.noteId, {
          [CLOZE_FIELD]: result.cloze,
          [SUBTITLE_FIELD]: result.sentence,
          [SENTENCE_STRESS_FIELD]: result.sentenceStress,
          [AUDIO_FIELD]: `[sound:${filename}]`,
          ...(result.translation ? { [TRANSLATION_FIELD]: result.translation } : {}),
        });
        await addTags([note.noteId], CHECKED_TAG);
        setStats(s => ({ ...s, changed: s.changed + 1 }));
      } else {
        await addTags([note.noteId], CHECKED_TAG);
        setStats(s => ({ ...s, unchanged: s.unchanged + 1 }));
      }
    } catch (error) {
      // Failed notes are not tagged, so they show up again on the next scan
      setFailed(prev => [...prev, { note, error: error instanceof Error ? error.message : String(error) }]);
    } finally {
      setApplying(n => n - 1);
    }
  };

  const pending = scan?.pending ?? [];
  const current = pending[index] as PendingNote | undefined;
  const currentTrim = current ? trims[current.noteId] : undefined;

  // Applied in the background so the user can move straight on to the next note
  const accept = (result: TrimClozeResult) => {
    if (!current) return;
    applyDecision(current, result);
    setIndex(i => i + 1);
  };

  const skip = () => {
    setStats(s => ({ ...s, skipped: s.skipped + 1 }));
    setIndex(i => i + 1);
  };

  const reviewed = stats.unchanged + stats.changed + stats.deleted + stats.skipped;

  return (
    <Container size="md">
      <Stack gap="lg">
        <div>
          <Text size="xs" tt="uppercase" fw={600} c="dimmed" className="tracking-wider">Anki Tools</Text>
          <Title order={2}>LR Sentence Clean Up</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Trims dangling fragments from the start and end of Language Reactor cloze sentences, one note at a time.
            Accepted changes update the Cloze, Subtitle, Sentence Stress, Translation and Audio Clip fields. Notes without
            enough context are deleted on accept. Accepted notes are tagged <code>{CHECKED_TAG}</code> and skipped next time.
          </Text>
        </div>

        <Switch
          label="Only clean up notes with Source = YouTube"
          checked={youtubeOnly}
          onChange={e => setYoutubeOnly(e.currentTarget.checked)}
          disabled={isScanning || applying > 0}
        />

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
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Sentences to review</Text>
              <Text size="xl" fw={700} c={pending.length > 0 ? "orange" : undefined}>{pending.length}</Text>
            </Paper>
          </SimpleGrid>
        )}

        {scan && pending.length > 0 && (
          <Stack gap={4}>
            <Progress value={(index / pending.length) * 100} />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{Math.min(index + 1, pending.length)} / {pending.length}</Text>
              <Text size="sm" c="dimmed">
                {stats.changed} changed · {stats.unchanged} unchanged · {stats.deleted} deleted · {stats.skipped} skipped
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
                    {f.note.subtitle} — {f.error}
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

        {current && (
          <Stack gap="md">
            {(!currentTrim || currentTrim.state === "loading") && (
              <>
                <SentenceBlock label="Current" cloze={current.cloze} translation={current.translation} />
                <Group gap="sm">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Checking sentence...</Text>
                </Group>
              </>
            )}

            {currentTrim?.state === "error" && (
              <>
                <SentenceBlock label="Current" cloze={current.cloze} translation={current.translation} />
                <Alert color="red" title="Trim request failed">
                  <Stack gap="sm">
                    <Text size="sm">{currentTrim.error}</Text>
                    <Group>
                      <Button size="xs" variant="light" color="red" onClick={() => requestTrim(current)}>Retry</Button>
                      <Button size="xs" variant="default" onClick={() => accept({ status: "unchanged" })}>Keep As Is</Button>
                      <Button size="xs" variant="subtle" color="gray" onClick={skip}>Skip</Button>
                    </Group>
                  </Stack>
                </Alert>
              </>
            )}

            {currentTrim?.state === "done" && currentTrim.result.status === "unchanged" && (
              <>
                <SentenceBlock label="Current" cloze={current.cloze} translation={current.translation} />
                <Alert color="green" title="No change needed" />
                <Group>
                  <Button color="green" onClick={() => accept(currentTrim.result)}>Accept</Button>
                  <Button variant="subtle" color="gray" onClick={skip}>Skip</Button>
                </Group>
              </>
            )}

            {currentTrim?.state === "done" && currentTrim.result.status === "changed" && (
              <>
                <SentenceBlock label="Before" cloze={current.cloze} translation={current.translation} />
                <SentenceBlock
                  label="After"
                  cloze={currentTrim.result.cloze}
                  translation={currentTrim.result.translation}
                  stress={currentTrim.result.sentenceStress}
                />
                <Group>
                  <Button onClick={() => accept(currentTrim.result)}>Accept Change</Button>
                  <Button variant="default" onClick={() => accept({ status: "unchanged" })}>Keep Original</Button>
                  <Button variant="subtle" color="gray" onClick={skip}>Skip</Button>
                </Group>
              </>
            )}

            {currentTrim?.state === "done" && currentTrim.result.status === "insufficientContext" && (
              <>
                <SentenceBlock label="Current" cloze={current.cloze} translation={current.translation} />
                <Alert color="red" title="Not enough context">
                  <Group gap="xs">
                    <Badge color="red" variant="light">Delete</Badge>
                    <Text size="sm">{currentTrim.result.reason ?? "The sentence is unsuitable for learning the target word."}</Text>
                  </Group>
                </Alert>
                <Group>
                  <Button color="red" onClick={() => accept(currentTrim.result)}>Accept &amp; Delete Note</Button>
                  <Button variant="default" onClick={() => accept({ status: "unchanged" })}>Keep Note</Button>
                  <Button variant="subtle" color="gray" onClick={skip}>Skip</Button>
                </Group>
              </>
            )}
          </Stack>
        )}

        {scan && !current && (
          pending.length > 0 ? (
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
            <Alert color="green">No unchecked Language Reactor cloze sentences.</Alert>
          )
        )}
      </Stack>
    </Container>
  );
}
