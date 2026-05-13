import { Button, Paper, Group, Stack, CopyButton, ActionIcon, Tooltip, Text, TextInput, Alert, Modal, Image } from "@mantine/core";
import type { Phrase, WordData } from "../api/api";
import { streamForvoBase64, generateWordImage, generateImageFromPrompt } from "../api/api";
import { GoogleImageSearch } from "./GoogleImageSearch";
import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { ankiDeckName } from "../config";

interface FlashcardProps {
  phrase: Phrase;
  selectedWord: string;
  wordData: WordData | null;
  isLoading: boolean;
  onBack: () => void;
  onImportSuccess?: () => void;
  onImportDismiss?: () => void;
  isForvoAudio?: boolean;
  imageUrl?: string;
}

export function Flashcard({ phrase, selectedWord, wordData, isLoading, onBack, onImportSuccess, onImportDismiss, isForvoAudio = false, imageUrl }: FlashcardProps) {
  const [localImageUrl, setLocalImageUrl] = useState(imageUrl || "");
  const [localImageBase64, setLocalImageBase64] = useState("");
  const [importError, setImportError] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [imageGenModalOpen, setImageGenModalOpen] = useState(false);
  const [generatedImageBase64, setGeneratedImageBase64] = useState("");
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [customPromptLoading, setCustomPromptLoading] = useState(false);
  const { acquireToken } = useAuth();

  const handleGenerateImage = async () => {
    if (!wordData) return;
    setImageGenLoading(true);
    try {
      const token = await acquireToken().catch(() => undefined);
      const result = await generateWordImage(
        wordData.baseForm,
        phrase.Phrase,
        wordData.englishTranslation,
        token
      );
      if (result) {
        setGeneratedImageBase64(result.imageBase64);
        setGeneratedImagePrompt(result.prompt);
        setImageGenModalOpen(true);
      }
    } finally {
      setImageGenLoading(false);
    }
  };

  const handleGenerateFromPrompt = async () => {
    if (!customPrompt.trim()) return;
    setCustomPromptLoading(true);
    try {
      const token = await acquireToken().catch(() => undefined);
      const result = await generateImageFromPrompt(customPrompt.trim(), token);
      if (result) {
        setGeneratedImageBase64(result.imageBase64);
        setGeneratedImagePrompt(customPrompt.trim());
        setImageGenModalOpen(true);
      }
    } finally {
      setCustomPromptLoading(false);
    }
  };

  return (
    <Paper p="xl" radius="lg" shadow="sm" className="bg-white border border-gray-100">
      <Stack gap="lg">
        <Group justify="space-between" align="center" className="pb-4 border-b border-gray-100">
          <Button
            variant="light"
            onClick={onBack}
            leftSection={<span>←</span>}
            className="hover:shadow-sm"
          >
            Back to Sentence
          </Button>
          <div className="px-3 py-1.5 bg-blue-50 rounded-full">
            <Text size="sm" fw={600} c="blue.7">
              {selectedWord}
            </Text>
          </div>
        </Group>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Text c="dimmed">Loading word data...</Text>
          </div>
        ) : wordData ? (
          <Stack gap="sm">
            {/* Row: Base Form + English Translation */}
            <Group align="flex-start" gap="sm" grow>
              <div>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={4} className="tracking-wider">Base Form</Text>
                <Paper p="sm" className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100" radius="md">
                  <Group justify="space-between" align="center">
                    <Text fw={600} size="md" c="blue.9">{wordData.baseFormStress || wordData.baseForm}</Text>
                    <CopyButton value={wordData.baseFormStress || wordData.baseForm}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                          <ActionIcon color={copied ? "teal" : "blue"} variant="subtle" onClick={copy} size="sm">
                            {copied ? "✓" : "📋"}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Paper>
              </div>
              <div>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={4} className="tracking-wider">English Translation</Text>
                <Paper p="sm" className="bg-gray-50 border border-gray-200" radius="md">
                  <Group justify="space-between" align="center">
                    <Text fw={500} size="md">{wordData.englishTranslation}</Text>
                    <CopyButton value={wordData.englishTranslation}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                          <ActionIcon color={copied ? "teal" : "gray"} variant="subtle" onClick={copy} size="sm">
                            {copied ? "✓" : "📋"}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Paper>
              </div>
            </Group>

            {/* Russian Meaning — full width */}
            <div>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={4} className="tracking-wider">Russian Meaning</Text>
              <Paper p="sm" className="bg-gray-50 border border-gray-200" radius="md">
                <Group justify="space-between" align="flex-start">
                  <Text fw={500} size="md" style={{ flex: 1 }}>{wordData.russianMeaning}</Text>
                  <CopyButton value={wordData.russianMeaning}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                        <ActionIcon color={copied ? "teal" : "gray"} variant="subtle" onClick={copy} size="sm">
                          {copied ? "✓" : "📋"}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Paper>
            </div>

            {/* Row: Phrase + Phrase with Stress */}
            <Group align="flex-start" gap="sm" grow>
              <div>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={4} className="tracking-wider">Phrase</Text>
                <Paper p="sm" className="bg-gray-50 border border-gray-200" radius="md">
                  <Group justify="space-between" align="center">
                    <Text fw={500} size="md">{phrase.Phrase}</Text>
                    <CopyButton value={phrase.Phrase}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                          <ActionIcon color={copied ? "teal" : "gray"} variant="subtle" onClick={copy} size="sm">
                            {copied ? "✓" : "📋"}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Paper>
              </div>
              <div>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={4} className="tracking-wider">Phrase with Stress</Text>
                <Paper p="sm" className="bg-gray-50 border border-gray-200" radius="md">
                  <Group justify="space-between" align="center">
                    <Text fw={500} size="md">{phrase.PhraseStress}</Text>
                    <CopyButton value={phrase.PhraseStress}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                          <ActionIcon color={copied ? "teal" : "gray"} variant="subtle" onClick={copy} size="sm">
                            {copied ? "✓" : "📋"}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Paper>
              </div>
            </Group>

            {/* Row: Audio + Image URL */}
            <Group align="flex-end" gap="sm" grow>
              <div>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={4} className="tracking-wider">Audio</Text>
                <Paper p="sm" className="bg-gray-50 border border-gray-200" radius="md">
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <audio controls style={{ flex: 1 }} className="h-8">
                      <source src={phrase.Audio} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <CopyButton value={isForvoAudio ? phrase.Audio + '.mp3' : phrase.Audio}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? "Copied" : "Copy"} withArrow position="left">
                          <ActionIcon color={copied ? "teal" : "gray"} variant="subtle" onClick={copy} size="sm">
                            {copied ? "✓" : "📋"}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Paper>
              </div>
              <div>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={4} className="tracking-wider">Image</Text>
                <Paper p="sm" className="bg-gray-50 border border-gray-200" radius="md">
                  <Group gap="xs" wrap="nowrap">
                    {localImageBase64 ? (
                      <Group gap="xs" style={{ flex: 1 }} align="center" wrap="nowrap">
                        <Image
                          src={`data:image/jpeg;base64,${localImageBase64}`}
                          alt="AI generated"
                          w={36}
                          h={36}
                          radius="sm"
                          fit="cover"
                          style={{ flexShrink: 0 }}
                        />
                        <Text size="sm" c="violet.7" fw={500} style={{ flex: 1 }}>AI generated image</Text>
                        <ActionIcon size="sm" variant="subtle" color="red" onClick={() => setLocalImageBase64("")}>×</ActionIcon>
                      </Group>
                    ) : (
                      <TextInput
                        placeholder="https://example.com/image.jpg"
                        value={localImageUrl}
                        onChange={e => setLocalImageUrl(e.currentTarget.value)}
                        size="sm"
                        variant="unstyled"
                        style={{ flex: 1 }}
                      />
                    )}
                    <Button size="xs" variant="light" onClick={() => setImageSearchOpen(true)}>
                      Search
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="violet"
                      onClick={handleGenerateImage}
                      loading={imageGenLoading}
                    >
                      Generate
                    </Button>
                  </Group>
                </Paper>
              </div>
            </Group>

            {/* Custom prompt image generation */}
            <div>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={4} className="tracking-wider">Custom Image Prompt</Text>
              <Paper p="sm" className="bg-gray-50 border border-gray-200" radius="md">
                <Group gap="xs" wrap="nowrap">
                  <TextInput
                    placeholder="Describe the image you want to generate..."
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.currentTarget.value)}
                    size="sm"
                    variant="unstyled"
                    style={{ flex: 1 }}
                    onKeyDown={e => { if (e.key === "Enter") handleGenerateFromPrompt(); }}
                  />
                  <Button
                    size="xs"
                    variant="light"
                    color="violet"
                    onClick={handleGenerateFromPrompt}
                    loading={customPromptLoading}
                    disabled={!customPrompt.trim()}
                  >
                    Generate
                  </Button>
                </Group>
              </Paper>
            </div>
          </Stack>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Text c="red" fw={500}>Failed to load word data</Text>
          </div>
        )}
      </Stack>

      <Modal
        opened={imageSearchOpen}
        onClose={() => setImageSearchOpen(false)}
        title={`Image search: ${selectedWord}`}
        size="90%"
        styles={{ body: { height: "80vh", overflowY: "auto" } }}
      >
        <GoogleImageSearch
          searchQuery={selectedWord}
          onImageSelect={(url) => {
            setLocalImageBase64("");
            setLocalImageUrl(url);
            setImageSearchOpen(false);
          }}
        />
      </Modal>

      <Modal
        opened={imageGenModalOpen}
        onClose={() => setImageGenModalOpen(false)}
        title={`Generated image: ${wordData?.baseForm}`}
        size="lg"
      >
        <Stack gap="md">
          {generatedImagePrompt && (
            <Text size="xs" c="dimmed">{generatedImagePrompt}</Text>
          )}
          {generatedImageBase64 && (
            <Tooltip label="Click to use this image" withArrow>
              <Image
                src={`data:image/jpeg;base64,${generatedImageBase64}`}
                alt="Generated flashcard image"
                radius="md"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setLocalImageUrl("");
                  setLocalImageBase64(generatedImageBase64);
                  setImageGenModalOpen(false);
                }}
              />
            </Tooltip>
          )}
        </Stack>
      </Modal>

      {/* Import Button for Anki/Media */}
      {wordData && (
        <Group justify="flex-end" mt="lg">
          <Button
            variant="outline"
            color="teal"
            onClick={async () => {
              // Helper to generate a GUID
              const generateGUID = () => {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                  const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                  return v.toString(16);
                });
              };

              // Helper to get safe base word for filename
              const getBaseWord = () => {
                return (selectedWord || 'audio').replace(/[^\w\d\u0400-\u04FF]+/g, '_');
              };

              // Helper to get audio filename
              const getAudioFilename = () => {
                return `${getBaseWord()}-${generateGUID()}.mp3`;
              };

              // Helper to get image filename
              const getImageFilename = () => {
                return `${getBaseWord()}-${generateGUID()}.jpg`;
              };

              // Helper to fetch audio as base64
              const getAudioBase64 = async (): Promise<string> => {
                if (!phrase.Audio) return "";
                if (isForvoAudio) {
                  try {
                    const token = await acquireToken();
                    return await streamForvoBase64(phrase.Audio, token);
                  } catch {
                    return await streamForvoBase64(phrase.Audio);
                  }
                }
                try {
                  const response = await fetch(phrase.Audio);
                  const blob = await response.blob();
                  return await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const result = reader.result;
                      resolve(typeof result === "string" ? result.split(",")[1] || "" : "");
                    };
                    reader.onerror = () => resolve("");
                    reader.readAsDataURL(blob);
                  });
                } catch {
                  return "";
                }
              };

              const resizeBase64 = (base64: string): Promise<string> => {
                return new Promise((resolve) => {
                  const img = new window.Image();
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.floor(img.naturalWidth / 4);
                    canvas.height = Math.floor(img.naturalHeight / 4);
                    const ctx = canvas.getContext("2d");
                    if (!ctx) { resolve(base64); return; }
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1] || base64);
                  };
                  img.onerror = () => resolve(base64);
                  img.src = `data:image/jpeg;base64,${base64}`;
                });
              };

              // Helper to fetch image as base64
              const getImageBase64 = async (): Promise<string> => {
                if (localImageBase64) return await resizeBase64(localImageBase64);
                if (!localImageUrl) return "";
                try {
                  const response = await fetch(localImageUrl);
                  if (!response.ok) throw new Error(`HTTP ${response.status}`);
                  const blob = await response.blob();
                  return await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const result = reader.result;
                      resolve(typeof result === "string" ? result.split(",")[1] || "" : "");
                    };
                    reader.onerror = () => resolve("");
                    reader.readAsDataURL(blob);
                  });
                } catch {
                  // Direct fetch failed (e.g. CORS) — proxy via server
                  try {
                    const token = await acquireToken().catch(() => undefined);
                    return await streamForvoBase64(localImageUrl, token) || "";
                  } catch {
                    return "";
                  }
                }
              };

              const filename = getAudioFilename();
              const base64Audio = await getAudioBase64();
              let imageFilename = "";
              let base64Image = "";
              if (localImageUrl || localImageBase64) {
                imageFilename = getImageFilename();
                base64Image = await getImageBase64();
              }
              // 1. storeMediaFile payloads
              const storeMediaPayloads = [];
              storeMediaPayloads.push({
                action: "storeMediaFile",
                version: 6,
                params: {
                  filename,
                  data: base64Audio,
                },
              });
              if ((localImageUrl || localImageBase64) && base64Image) {
                storeMediaPayloads.push({
                  action: "storeMediaFile",
                  version: 6,
                  params: {
                    filename: imageFilename,
                    data: base64Image,
                  },
                });
              }
              // 2. addNote payload (field order: Word, Translation, Meaning, Context, Context Stress, Context Audio, Image)
              const addNotePayload = {
                action: "addNote",
                version: 6,
                params: {
                  note: {
                    deckName: ankiDeckName,
                    modelName: "Sentence Card",
                    options: { allowDuplicate: true },
                    fields: {
                      Word: wordData.baseFormStress || wordData.baseForm,
                      Translation: wordData.englishTranslation,
                      Meaning: wordData.russianMeaning,
                      Context: phrase.Phrase,
                      "Context Stress": phrase.PhraseStress,
                      "Context Audio": `[sound:${filename}]`,
                      Image: (localImageUrl || localImageBase64) && imageFilename ? `<img src='${imageFilename}'>` : "",
                      "Vocab?": "",
                    },
                    tags: ["generated"],
                  },
                },
              };
              const ankiUrl = "http://localhost:8765";

              try {
                for (const payload of storeMediaPayloads) {
                  const res = await fetch(ankiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) throw new Error(`storeMediaFile failed: ${res.status}`);
                  const data = await res.json();
                  if (data.error) throw new Error(`storeMediaFile error: ${data.error}`);
                }

                const noteRes = await fetch(ankiUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(addNotePayload),
                });
                if (!noteRes.ok) throw new Error(`addNote failed: ${noteRes.status}`);
                const noteData = await noteRes.json();
                if (noteData.error) throw new Error(`addNote error: ${noteData.error}`);

                onImportSuccess?.();
                (onImportDismiss ?? onBack)();
              } catch {
                setImportError(true);
              }
            }}
          >
            Import
          </Button>
        </Group>
      )}

      {importError && (
        <Alert
          color="red"
          mt="md"
          withCloseButton
          onClose={() => setImportError(false)}
        >
          Import failed. Please try again.
        </Alert>
      )}
    </Paper>
  );
}
