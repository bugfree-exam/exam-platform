import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

export const MAX_TASK_FILES = 5;
export const MAX_TASK_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_TASK_FILE_EXTENSIONS = [
  ".txt",
  ".odt",
  ".ods",
  ".xls",
  ".doc",
] as const;

type AllowedExtension =
  (typeof ALLOWED_TASK_FILE_EXTENSIONS)[number];

const allowedExtensions = new Set<string>(
  ALLOWED_TASK_FILE_EXTENSIONS
);

const mimeTypeByExtension: Record<AllowedExtension, string> = {
  ".txt": "text/plain; charset=utf-8",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".xls": "application/vnd.ms-excel",
  ".doc": "application/msword",
};

export type ValidatedTaskFile = {
  originalName: string;
  extension: AllowedExtension;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type StoredTaskFile = ValidatedTaskFile & {
  storedName: string;
  absolutePath: string;
};

export function getTaskFilesDirectory(): string {
  const configuredDirectory =
    process.env.TASK_FILES_DIR?.trim();

  if (configuredDirectory) {
    return path.resolve(configuredDirectory);
  }

  return path.join(process.cwd(), "storage", "task-files");
}

export async function ensureTaskFilesDirectory(): Promise<string> {
  const directory = getTaskFilesDirectory();

  await mkdir(directory, {
    recursive: true,
    mode: 0o750,
  });

  return directory;
}

export function getTaskFileExtension(
  filename: string
): string {
  return path.extname(filename).toLowerCase();
}

export function sanitizeOriginalFilename(
  filename: string
): string {
  const basename = path.basename(filename);

  const sanitized = basename
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "_")
    .trim();

  if (!sanitized) {
    throw new Error("Файл должен иметь корректное имя");
  }

  if (sanitized.length > 180) {
    throw new Error(
      "Имя файла не должно превышать 180 символов"
    );
  }

  return sanitized;
}

export async function validateTaskFile(
  file: File
): Promise<ValidatedTaskFile> {
  const originalName = sanitizeOriginalFilename(file.name);
  const extension = getTaskFileExtension(originalName);

  if (!allowedExtensions.has(extension)) {
    throw new Error(
      "Разрешены только файлы .txt, .odt, .ods, .xls и .doc"
    );
  }

  if (file.size <= 0) {
    throw new Error(`Файл «${originalName}» пуст`);
  }

  if (file.size > MAX_TASK_FILE_SIZE_BYTES) {
    throw new Error(
      `Файл «${originalName}» превышает допустимый размер 20 МБ`
    );
  }

  const typedExtension = extension as AllowedExtension;
  const arrayBuffer = await file.arrayBuffer();

  return {
    originalName,
    extension: typedExtension,
    mimeType: mimeTypeByExtension[typedExtension],
    sizeBytes: file.size,
    buffer: Buffer.from(arrayBuffer),
  };
}

export async function storeTaskFile(
  file: ValidatedTaskFile
): Promise<StoredTaskFile> {
  const directory = await ensureTaskFilesDirectory();
  const storedName = `${randomUUID()}${file.extension}`;
  const absolutePath = path.join(directory, storedName);

  await writeFile(absolutePath, file.buffer, {
    flag: "wx",
    mode: 0o640,
  });

  return {
    ...file,
    storedName,
    absolutePath,
  };
}

export function resolveStoredTaskFilePath(
  storedName: string
): string {
  const safeStoredName = path.basename(storedName);

  if (safeStoredName !== storedName) {
    throw new Error("Некорректное имя сохранённого файла");
  }

  return path.join(
    getTaskFilesDirectory(),
    safeStoredName
  );
}

export async function readStoredTaskFile(
  storedName: string
): Promise<Buffer> {
  return readFile(resolveStoredTaskFilePath(storedName));
}

export async function deleteStoredTaskFile(
  storedName: string
): Promise<void> {
  try {
    await unlink(resolveStoredTaskFilePath(storedName));
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code !== "ENOENT") {
      throw error;
    }
  }
}

export function buildDownloadContentDisposition(
  originalName: string
): string {
  const safeName = sanitizeOriginalFilename(originalName);

  const asciiFallback = safeName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");

  return [
    `attachment; filename="${asciiFallback}"`,
    `filename*=UTF-8''${encodeURIComponent(safeName)}`,
  ].join("; ");
}