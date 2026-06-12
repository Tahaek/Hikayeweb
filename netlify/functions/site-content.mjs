import { randomUUID } from "node:crypto";
import { verifyPassword } from "./lib/admin-auth.mjs";
import { getSections, saveSections } from "./lib/site-content-store.mjs";

const SECTION_KEYS = new Set(["story", "development", "businesses"]);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function unauthorized() {
  return jsonResponse({ message: "Unauthorized." }, 401);
}

function ensureAdmin(request) {
  return verifyPassword(request.headers.get("x-admin-password") || "");
}

function sanitizeEntry(rawEntry) {
  return {
    title: typeof rawEntry?.title === "string" ? rawEntry.title.trim() : "",
    body: typeof rawEntry?.body === "string" ? rawEntry.body.trim() : "",
    imageDataUrl: typeof rawEntry?.imageDataUrl === "string" ? rawEntry.imageDataUrl : "",
    imageAlt: typeof rawEntry?.imageAlt === "string" ? rawEntry.imageAlt.trim() : "",
  };
}

function validateSection(section) {
  return typeof section === "string" && SECTION_KEYS.has(section);
}

function moveItem(entries, fromIndex, toIndex) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= entries.length ||
    toIndex >= entries.length ||
    fromIndex === toIndex
  ) {
    return [...entries];
  }

  const nextEntries = [...entries];
  const [movedItem] = nextEntries.splice(fromIndex, 1);
  nextEntries.splice(toIndex, 0, movedItem);
  return nextEntries;
}

function normalizeEntryOrder(entries) {
  return entries.map((entry, index) => ({
    ...entry,
    order: index,
  }));
}

export default async (request) => {
  if (request.method === "GET") {
    const sections = await getSections();
    return jsonResponse({ sections });
  }

  if (!ensureAdmin(request)) {
    return unauthorized();
  }

  const payload = await request.json().catch(() => ({}));
  const section = payload.section;

  if (!validateSection(section)) {
    return jsonResponse({ message: "Valid section is required." }, 400);
  }

  const sections = await getSections();

  if (request.method === "POST") {
    const entry = sanitizeEntry(payload.entry);

    if (!entry.title && !entry.body && !entry.imageDataUrl) {
      return jsonResponse({ message: "At least one content field is required." }, 400);
    }

    sections[section] = normalizeEntryOrder([{ id: randomUUID(), ...entry }, ...sections[section]]);
    await saveSections(sections);
    return jsonResponse({ sections });
  }

  if (request.method === "PUT") {
    const entryId = typeof payload.id === "string" ? payload.id : "";
    const entry = sanitizeEntry(payload.entry);

    if (!entryId || (!entry.title && !entry.body && !entry.imageDataUrl)) {
      return jsonResponse({ message: "Entry id and at least one content field are required." }, 400);
    }

    sections[section] = normalizeEntryOrder(
      sections[section].map((item) => (item.id === entryId ? { ...item, ...entry } : item))
    );
    await saveSections(sections);
    return jsonResponse({ sections });
  }

  if (request.method === "DELETE") {
    const entryId = typeof payload.id === "string" ? payload.id : "";
    if (!entryId) {
      return jsonResponse({ message: "Entry id is required." }, 400);
    }

    sections[section] = normalizeEntryOrder(sections[section].filter((item) => item.id !== entryId));
    await saveSections(sections);
    return jsonResponse({ sections });
  }

  if (request.method === "PATCH") {
    const entryId = typeof payload.id === "string" ? payload.id : "";
    const direction = payload.direction === "up" || payload.direction === "down" ? payload.direction : "";
    const orderedIds = Array.isArray(payload.orderedIds)
      ? payload.orderedIds.filter((value) => typeof value === "string")
      : [];

    if (orderedIds.length) {
      const currentIds = sections[section].map((item) => item.id);

      if (
        orderedIds.length !== currentIds.length ||
        orderedIds.some((value) => !currentIds.includes(value))
      ) {
        return jsonResponse({ message: "Ordered ids do not match section entries." }, 400);
      }

      const orderedMap = new Map(sections[section].map((item) => [item.id, item]));
      sections[section] = normalizeEntryOrder(orderedIds.map((id) => orderedMap.get(id)).filter(Boolean));
      await saveSections(sections);
      return jsonResponse({ sections });
    }

    if (!entryId || !direction) {
      return jsonResponse({ message: "Entry id and direction are required." }, 400);
    }

    const currentIndex = sections[section].findIndex((item) => item.id === entryId);
    if (currentIndex === -1) {
      return jsonResponse({ message: "Entry not found." }, 404);
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    sections[section] = normalizeEntryOrder(moveItem(sections[section], currentIndex, targetIndex));
    await saveSections(sections);
    return jsonResponse({ sections });
  }

  return jsonResponse({ message: "Method not allowed." }, 405);
};
