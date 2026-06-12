import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "anthony-morgan-site-content";
const STORE_KEY = "sections";
const DATA_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  ".data",
  "site-content.json"
);

function shouldUseLocalFileStore() {
  return Boolean(process.env.NETLIFY_LOCAL || process.platform === "win32");
}

function blankSections() {
  return {
    story: [],
    development: [],
    businesses: [],
  };
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => ({
      ...entry,
      order: Number.isFinite(entry?.order) ? entry.order : index,
    }))
    .sort((left, right) => left.order - right.order)
    .map((entry, index) => ({
      ...entry,
      order: index,
    }));
}

function normalizeSections(raw) {
  return {
    story: normalizeEntries(raw?.story),
    development: normalizeEntries(raw?.development),
    businesses: normalizeEntries(raw?.businesses),
  };
}

async function readLocalSections() {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalizeSections(JSON.parse(raw));
  } catch {
    return blankSections();
  }
}

async function writeLocalSections(sections) {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(sections, null, 2), "utf8");
}

async function readBlobSections() {
  const store = getStore(STORE_NAME);
  const sections = await store.get(STORE_KEY, { type: "json" });
  return normalizeSections(sections);
}

async function writeBlobSections(sections) {
  const store = getStore(STORE_NAME);
  await store.setJSON(STORE_KEY, sections);
}

export async function getSections() {
  if (shouldUseLocalFileStore()) {
    return readLocalSections();
  }

  try {
    return await readBlobSections();
  } catch (error) {
    throw new Error(`Netlify Blobs okunamadi: ${error.message}`);
  }
}

export async function saveSections(sections) {
  const normalized = normalizeSections(sections);

  if (shouldUseLocalFileStore()) {
    await writeLocalSections(normalized);
    return;
  }

  try {
    await writeBlobSections(normalized);
  } catch (error) {
    throw new Error(`Netlify Blobs yazilamadi: ${error.message}`);
  }
}
