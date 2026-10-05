const ANKI_CONNECT_URL = "http://localhost:8765";
const ANKI_CONNECT_VERSION = 6;

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

export type { AnkiNoteInfo, AnkiNoteField };
