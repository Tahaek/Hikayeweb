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

function isNetlifyRuntime() {
  return Boolean(process.env.NETLIFY || process.env.BLOBS_CONTEXT);
}

function blankSections() {
  return {
    story: [],
    development: [],
    businesses: [],
  };
}

function normalizeSections(raw) {
  return {
    story: Array.isArray(raw?.story) ? raw.story : [],
    development: Array.isArray(raw?.development) ? raw.development : [],
    businesses: Array.isArray(raw?.businesses) ? raw.businesses : [],
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

export async function getSections() {
  if (isNetlifyRuntime()) {
    const store = getStore(STORE_NAME);
    const sections = await store.get(STORE_KEY, { type: "json" });
    return normalizeSections(sections);
  }

  return readLocalSections();
}

export async function saveSections(sections) {
  const normalized = normalizeSections(sections);

  if (isNetlifyRuntime()) {
    const store = getStore(STORE_NAME);
    await store.setJSON(STORE_KEY, normalized);
    return;
  }

  await writeLocalSections(normalized);
}
