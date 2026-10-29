const ANKI_CONNECT_URL = "http://localhost:8765";
const ANKI_CONNECT_VERSION = 6;

// Audio Cards copy a Sentence Card's fields into a separate deck that drills listening only
export const AUDIO_CARD_DECK = "Master Deck::Audio Cards";
export const AUDIO_CARD_MODEL = "Audio Card";
// Added to the source Sentence Card so the Generate Audio Cards page never shows it
export const AUDIO_CARD_CREATED_TAG = "audio-card-created";

interface AnkiNoteField {
  value: string;
  order: number;
}

interface AnkiNoteInfo {
  noteId: number;
  modelName: string;
  tags: string[];
  fields: Record<string, AnkiNoteField>;
}

// Generic AnkiConnect request; throws on HTTP errors or AnkiConnect-reported errors
export async function ankiInvoke<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(ANKI_CONNECT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version: ANKI_CONNECT_VERSION, params }),
  });

  if (!response.ok) throw new Error(`AnkiConnect ${action} failed: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(`AnkiConnect ${action} error: ${data.error}`);
  return data.result as T;
}

// Returns true when AnkiConnect is reachable
export async function isAnkiConnectAvailable(): Promise<boolean> {
  try {
    await ankiInvoke<number>("version");
    return true;
  } catch {
    return false;
  }
}

export async function findNotes(query: string): Promise<number[]> {
  return ankiInvoke<number[]>("findNotes", { query });
}

export async function notesInfo(noteIds: number[]): Promise<AnkiNoteInfo[]> {
  if (noteIds.length === 0) return [];
  return ankiInvoke<AnkiNoteInfo[]>("notesInfo", { notes: noteIds });
}

// Only the fields passed in are changed; all other fields on the note are left as-is
export async function updateNoteFields(noteId: number, fields: Record<string, string>): Promise<void> {
  await ankiInvoke<null>("updateNoteFields", { note: { id: noteId, fields } });
}

// Tags are space-separated in AnkiConnect
export async function addTags(noteIds: number[], tags: string): Promise<void> {
  if (noteIds.length === 0) return;
  await ankiInvoke<null>("addTags", { notes: noteIds, tags });
}

export async function deleteNotes(noteIds: number[]): Promise<void> {
  if (noteIds.length === 0) return;
  await ankiInvoke<null>("deleteNotes", { notes: noteIds });
}

// Anki downloads the file from the URL itself; returns the stored filename
export async function storeMediaFileFromUrl(filename: string, url: string): Promise<string> {
  return ankiInvoke<string>("storeMediaFile", { filename, url });
}

// Returns the new note's ID
export async function addNote(deckName: string, modelName: string, fields: Record<string, string>, tags: string[] = []): Promise<number> {
  return ankiInvoke<number>("addNote", {
    note: { deckName, modelName, fields, tags, options: { allowDuplicate: true } },
  });
}

// Returns the file's contents base64-encoded, or false if it does not exist
export async function retrieveMediaFile(filename: string): Promise<string | false> {
  return ankiInvoke<string | false>("retrieveMediaFile", { filename });
}

// Anki search syntax treats these as wildcards/delimiters inside a quoted term
function escapeSearchText(text: string): string {
  return text.replace(/[\\"*_]/g, "\\$&");
}

// Creates an Audio Card from a newly added Sentence Card and tags the source note, mirroring the
// Generate Audio Cards page. Skips creation when an Audio Card for the same sentence already exists
// (e.g. another word from the same sentence was imported). Returns true if a new card was created.
export async function createAudioCardForSentence(sentenceNoteId: number, fields: Record<string, string>): Promise<boolean> {
  const existing = await findNotes(`deck:"${AUDIO_CARD_DECK}" note:"${AUDIO_CARD_MODEL}" "Context:${escapeSearchText(fields.Context ?? "")}"`);
  if (existing.length === 0) await addNote(AUDIO_CARD_DECK, AUDIO_CARD_MODEL, fields);
  await addTags([sentenceNoteId], AUDIO_CARD_CREATED_TAG);
  return existing.length === 0;
}

export type { AnkiNoteInfo, AnkiNoteField };
