export type FileToolId = "notepad" | "image" | "pdf" | "video" | "audio" | "download";

export type FileToolDef = {
  id: FileToolId;
  label: string;
  description: string;
  icon: string;
  /** Can write changes back to the remote device. */
  editable: boolean;
};

export const FILE_TOOLS: Record<FileToolId, FileToolDef> = {
  notepad: {
    id: "notepad",
    label: "Notepad",
    description: "View and edit text — save writes back to the device.",
    icon: "doc",
    editable: true,
  },
  image: {
    id: "image",
    label: "Image viewer",
    description: "Preview pictures with zoom.",
    icon: "eye",
    editable: false,
  },
  pdf: {
    id: "pdf",
    label: "PDF reader",
    description: "Read PDFs in Hudl without downloading first.",
    icon: "doc",
    editable: false,
  },
  video: {
    id: "video",
    label: "Video player",
    description: "Play WebM, MP4, and other browser-supported video.",
    icon: "monitor",
    editable: false,
  },
  audio: {
    id: "audio",
    label: "Audio player",
    description: "Play music and voice clips in-session.",
    icon: "activity",
    editable: false,
  },
  download: {
    id: "download",
    label: "Download",
    description: "Save a copy to this phone or PC.",
    icon: "download",
    editable: false,
  },
};

/** Tools shown in Open with (excluding download at end). */
export const VIEWER_TOOL_IDS: FileToolId[] = ["notepad", "image", "pdf", "video", "audio"];

const TEXT_EXT = new Set([
  "txt", "md", "markdown", "rst", "json", "jsonc", "json5", "csv", "tsv", "log", "xml",
  "html", "htm", "xhtml", "css", "scss", "sass", "less", "js", "jsx", "mjs", "cjs",
  "ts", "tsx", "py", "pyw", "rb", "go", "rs", "java", "kt", "kts", "c", "h", "cpp", "cc",
  "cxx", "hpp", "cs", "php", "sql", "yml", "yaml", "toml", "ini", "cfg", "conf", "env",
  "gitignore", "gitattributes", "dockerignore", "editorconfig", "ps1", "psm1", "bat",
  "cmd", "sh", "bash", "zsh", "fish", "vue", "svelte", "astro", "graphql", "gql", "r",
  "lua", "pl", "pm", "swift", "dart", "makefile", "cmake", "dockerfile", "nginx",
  "properties", "gradle", "groovy", "kt", "tex", "bib", "srt", "vtt", "ass", "inf",
  "reg", "plist", "strings", "podspec", "gemspec", "lock", "sum", "mod", "nix",
]);

const IMAGE_EXT = new Set([
  "png", "jpg", "jpeg", "jfif", "gif", "webp", "bmp", "ico", "avif", "tif", "tiff",
  "svg", "heic", "heif", "apng", "jxl",
]);

const PDF_EXT = new Set(["pdf"]);

const VIDEO_EXT = new Set([
  "webm", "mp4", "m4v", "mov", "ogv", "ogg", "mkv", "avi", "mpeg", "mpg", "3gp", "3g2",
]);

const AUDIO_EXT = new Set([
  "mp3", "wav", "wave", "flac", "m4a", "aac", "opus", "oga", "weba", "aiff", "aif",
  "wma", "mid", "midi",
]);

const MIME_BY_EXT: Record<string, string> = {
  // images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  tif: "image/tiff",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  apng: "image/apng",
  // video (webm first-class)
  webm: "video/webm",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  ogv: "video/ogg",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  // audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  wave: "audio/wav",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  opus: "audio/opus",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  weba: "audio/webm",
  aiff: "audio/aiff",
  aif: "audio/aiff",
  mid: "audio/midi",
  midi: "audio/midi",
  // docs / text
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  xml: "application/xml",
};

export function fileExtension(name: string): string {
  const base = name.split(/[/\\]/).pop() || name;
  if (base.startsWith(".") && !base.slice(1).includes(".")) {
    return base.slice(1).toLowerCase();
  }
  const i = base.lastIndexOf(".");
  if (i <= 0) return "";
  return base.slice(i + 1).toLowerCase();
}

export function defaultToolForFile(name: string): FileToolId | null {
  const ext = fileExtension(name);
  if (!ext) return null;
  // .ogg can be audio or video container — prefer audio for plain .ogg
  if (ext === "ogg") return "audio";
  if (VIDEO_EXT.has(ext)) return "video";
  if (AUDIO_EXT.has(ext)) return "audio";
  if (IMAGE_EXT.has(ext)) return "image";
  if (PDF_EXT.has(ext)) return "pdf";
  if (TEXT_EXT.has(ext)) return "notepad";
  return null;
}

export function toolsForFile(name: string): FileToolId[] {
  const def = defaultToolForFile(name);
  const all: FileToolId[] = [...VIEWER_TOOL_IDS, "download"];
  if (!def) return all;
  return [def, ...all.filter((t) => t !== def)];
}

export function mimeForFile(name: string): string {
  const ext = fileExtension(name);
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

/** Human list of supported kinds for empty/help copy. */
export function supportedTypeSummary(): string {
  return "text, images, PDF, WebM/MP4 video, MP3/WAV audio, and more";
}

export function base64ToBytes(contentBase64: string): Uint8Array {
  const bin = atob(contentBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function base64ToObjectUrl(contentBase64: string, mime: string): string {
  const bytes = base64ToBytes(contentBase64);
  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

export function decodeTextBase64(contentBase64: string): string {
  const bytes = base64ToBytes(contentBase64);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    }
  }
}

export function encodeTextBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
