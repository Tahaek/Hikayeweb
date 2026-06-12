const HERO_IMAGE = "./assets/anthony-morgan-hero.png";
const STORAGE_KEY = "anthony-morgan-site-content";
const CONTENT_ENDPOINT = "/.netlify/functions/site-content";
const AUTH_ENDPOINT = "/.netlify/functions/development-admin";

const SECTIONS = {
  story: {
    label: "Karakter Hikayesi",
    emptyTitle: "Karakter hikayesi bos",
    emptyText: "Bu bolum sen icerik ekleyene kadar bos kalir.",
    intro: "Karakterin ana hikayesini gorsel ve metin bloklariyla burada duzenleyebilirsin.",
  },
  development: {
    label: "Karakter Gelisimi",
    emptyTitle: "Karakter gelisimi bos",
    emptyText: "Bu bolum yeni gelisim kayitlari eklenene kadar bos kalir.",
    intro: "Gelisim notlari, donum noktalari ve yeni surecler burada toplanir.",
  },
  businesses: {
    label: "Isletmeler",
    emptyTitle: "Isletmeler bolumu bos",
    emptyText: "Bu bolum isletme ve mekan icerikleri eklenene kadar bos kalir.",
    intro: "Isletme, mekan ve baglantili alanlarin gorsel ve metin bloklarini burada yonetebilirsin.",
  },
};

const state = {
  activeTab: "story",
  sections: {
    story: [],
    development: [],
    businesses: [],
  },
  storageMode: "cloud",
  storageLabel: "Ortak kayit acik",
  storageHint: "Ekledigin icerikler bagli cihazlarda da gorunur.",
  loading: true,
  isEditMode: false,
  showPasswordDialog: false,
  passwordInput: "",
  passwordError: "",
  adminPassword: "",
  editorMode: null,
  editorSection: null,
  editingId: null,
  draft: blankEntry(),
  flashMessage: "",
  saveState: "idle",
  saveMessage: "",
  reorderState: {
    active: false,
    sectionKey: "",
    entryId: "",
    direction: "",
  },
};

function blankEntry() {
  return {
    title: "",
    body: "",
    imageDataUrl: "",
    imageAlt: "",
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setFlashMessage(message) {
  state.flashMessage = message;
}

function clearFlashMessage() {
  state.flashMessage = "";
}

function setSaveState(mode, message = "") {
  state.saveState = mode;
  state.saveMessage = message;
}

function clearSaveState() {
  setSaveState("idle", "");
}

function setReorderState(active, sectionKey = "", entryId = "", direction = "") {
  state.reorderState = {
    active,
    sectionKey,
    entryId,
    direction,
  };
}

function loadLocalSections() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { story: [], development: [], businesses: [] };
    }

    const parsed = JSON.parse(raw);
    return {
      story: Array.isArray(parsed.story) ? parsed.story : [],
      development: Array.isArray(parsed.development) ? parsed.development : [],
      businesses: Array.isArray(parsed.businesses) ? parsed.businesses : [],
    };
  } catch {
    return { story: [], development: [], businesses: [] };
  }
}

function saveLocalSections() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sections));
}

function setStoragePresentation(mode) {
  if (mode === "cloud") {
    state.storageMode = "cloud";
    state.storageLabel = "Ortak kayit acik";
    state.storageHint = "Ekledigin icerikler bagli cihazlarda da gorunur.";
    return;
  }

  state.storageMode = "local";
  state.storageLabel = "Sadece bu cihaz";
  state.storageHint = "Bu ortamda icerikler sadece kullandigin tarayicida tutulur.";
}

async function loadSections() {
  state.loading = true;
  renderApp();

  try {
    const response = await fetch(CONTENT_ENDPOINT, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const payload = await response.json();
    state.sections = normalizeSections(payload.sections);
    setStoragePresentation("cloud");
  } catch {
    state.sections = loadLocalSections();
    setStoragePresentation("local");
  } finally {
    state.loading = false;
  }
}

function normalizeSections(raw) {
  return {
    story: Array.isArray(raw?.story) ? raw.story : [],
    development: Array.isArray(raw?.development) ? raw.development : [],
    businesses: Array.isArray(raw?.businesses) ? raw.businesses : [],
  };
}

async function verifyAdminPassword(password) {
  try {
    const response = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return payload.ok === true;
  } catch {
    return false;
  }
}

async function readResponsePayload(response) {
  const rawText = await response.text();

  try {
    return {
      rawText,
      data: rawText ? JSON.parse(rawText) : {},
    };
  } catch {
    return {
      rawText,
      data: {},
    };
  }
}

async function saveEntryToStorage(sectionKey, mode, entry, entryId = null) {
  if (state.storageMode === "cloud") {
    const response = await fetch(CONTENT_ENDPOINT, {
      method: mode === "create" ? "POST" : "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": state.adminPassword,
      },
      body: JSON.stringify({
        section: sectionKey,
        id: entryId,
        entry,
      }),
    });

    const payload = await readResponsePayload(response);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Yonetici sifresi sunucuda dogrulanamadi. Netlify sifresini kontrol et.");
      }

      throw new Error(payload.data.message || payload.rawText || "Kayit saklanamadi.");
    }

    state.sections = normalizeSections(payload.data.sections);
    return;
  }

  if (mode === "create") {
    state.sections[sectionKey] = [
      {
        id: crypto.randomUUID(),
        ...entry,
      },
      ...state.sections[sectionKey],
    ];
  } else {
    state.sections[sectionKey] = state.sections[sectionKey].map((item) =>
      item.id === entryId ? { ...item, ...entry } : item
    );
  }

  saveLocalSections();
}

async function deleteEntryFromStorage(sectionKey, entryId) {
  if (state.storageMode === "cloud") {
    const response = await fetch(CONTENT_ENDPOINT, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": state.adminPassword,
      },
      body: JSON.stringify({ section: sectionKey, id: entryId }),
    });

    const payload = await readResponsePayload(response);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Silme istegi reddedildi. Yonetici sifresi sunucuda dogrulanamadi.");
      }

      throw new Error(payload.data.message || payload.rawText || "Kayit silinemedi.");
    }

    state.sections = normalizeSections(payload.data.sections);
    return;
  }

  state.sections[sectionKey] = state.sections[sectionKey].filter((item) => item.id !== entryId);
  saveLocalSections();
}

function moveItem(entries, fromIndex, toIndex) {
  if (
    !Array.isArray(entries) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= entries.length ||
    toIndex >= entries.length ||
    fromIndex === toIndex
  ) {
    return Array.isArray(entries) ? [...entries] : [];
  }

  const nextEntries = [...entries];
  const [movedItem] = nextEntries.splice(fromIndex, 1);
  nextEntries.splice(toIndex, 0, movedItem);
  return nextEntries;
}

async function moveEntryInStorage(sectionKey, entryId, direction) {
  if (state.storageMode === "cloud") {
    const response = await fetch(CONTENT_ENDPOINT, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": state.adminPassword,
      },
      body: JSON.stringify({ section: sectionKey, id: entryId, direction }),
    });

    const payload = await readResponsePayload(response);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Tasima istegi reddedildi. Yonetici sifresi sunucuda dogrulanamadi.");
      }

      throw new Error(payload.data.message || payload.rawText || "Icerik tasinamadi.");
    }

    state.sections = normalizeSections(payload.data.sections);
    return;
  }

  saveLocalSections();
}

function moveEntryLocally(sectionKey, entryId, direction) {
  const entries = state.sections[sectionKey];
  const currentIndex = entries.findIndex((item) => item.id === entryId);

  if (currentIndex === -1) {
    return false;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  const nextEntries = moveItem(entries, currentIndex, targetIndex);

  if (nextEntries.every((item, index) => item.id === entries[index]?.id)) {
    return false;
  }

  state.sections[sectionKey] = nextEntries;
  return true;
}

function renderFlashMessage() {
  if (!state.flashMessage) {
    return "";
  }

  return `<p class="flash-message">${escapeHtml(state.flashMessage)}</p>`;
}

function renderSaveMessage() {
  if (state.saveState === "idle" || !state.saveMessage) {
    return "";
  }

  const className =
    state.saveState === "error"
      ? "flash-message flash-message--error"
      : state.saveState === "success"
        ? "flash-message flash-message--success"
        : "flash-message";

  return `<p class="${className}">${escapeHtml(state.saveMessage)}</p>`;
}

function renderEditor(sectionKey) {
  if (!(state.isEditMode && state.editorMode && state.editorSection === sectionKey)) {
    return "";
  }

  return `
    <article class="editor-card">
      <p class="section-label">${state.editorMode === "create" ? "Yeni Icerik" : "Icerik Duzenle"}</p>
      <h3 class="panel__title">
        ${state.editorMode === "create" ? "Yeni blok ekle" : "Icerik blogunu guncelle"}
      </h3>
      <p class="panel-copy">
        Gorsel ve metin bir arada kaydedilir. ${
          state.storageMode === "cloud"
            ? "Kayitlar bagli cihazlarda da gorunur."
            : "Kayitlar su anda sadece bu cihazda tutulur."
        }
      </p>
      <form class="editor-grid" id="content-form">
        <div class="field">
          <label for="entry-title">Baslik</label>
          <input id="entry-title" name="title" type="text" value="${escapeHtml(state.draft.title)}" />
        </div>
        <div class="field">
          <label for="entry-body">Metin</label>
          <textarea id="entry-body" name="body">${escapeHtml(state.draft.body)}</textarea>
        </div>
        <div class="field">
          <label for="entry-image">Gorsel</label>
          <input id="entry-image" name="image" type="file" accept="image/*" />
        </div>
        <div class="field">
          <label for="entry-image-alt">Gorsel aciklamasi (opsiyonel)</label>
          <input id="entry-image-alt" name="imageAlt" type="text" value="${escapeHtml(state.draft.imageAlt)}" />
        </div>
        ${
          state.draft.imageDataUrl
            ? `
              <div class="image-preview">
                <img src="${state.draft.imageDataUrl}" alt="${escapeHtml(state.draft.imageAlt || "Onizleme")}" />
                <button class="ghost-button" type="button" data-action="remove-image">Gorseli Kaldir</button>
              </div>
            `
            : ""
        }
        <div class="editor-actions">
          <button class="primary-button" type="submit" ${state.saveState === "saving" ? "disabled" : ""}>
            ${
              state.saveState === "saving"
                ? "Kaydediliyor..."
                : state.editorMode === "create"
                  ? "Kaydet"
                  : "Guncelle"
            }
          </button>
          <button class="ghost-button" type="button" data-action="cancel-editor">Iptal</button>
        </div>
        ${renderSaveMessage()}
      </form>
    </article>
  `;
}

function renderEntries(sectionKey) {
  const entries = state.sections[sectionKey];

  if (state.loading) {
    return `
      <section class="empty-state">
        <h3 class="empty-state__title">Icerikler yukleniyor</h3>
        <p class="empty-state__text">Bu bolum hazirlaniyor.</p>
      </section>
    `;
  }

  if (!entries.length) {
    return `
      <section class="empty-state">
        <h3 class="empty-state__title">${escapeHtml(SECTIONS[sectionKey].emptyTitle)}</h3>
        <p class="empty-state__text">${escapeHtml(SECTIONS[sectionKey].emptyText)}</p>
      </section>
    `;
  }

  return `
    <div class="entry-list">
      ${entries
        .map((entry, index) => `
            <article class="entry-card">
              ${
                entry.imageDataUrl
                  ? `
                    <div class="entry-card__image-wrap">
                      <img class="entry-card__image" src="${entry.imageDataUrl}" alt="${escapeHtml(
                        entry.imageAlt || entry.title || "Gorsel"
                      )}" />
                    </div>
                  `
                  : ""
              }
              <div class="entry-card__header">
                <div>
                  ${
                    entry.title
                      ? `<h3 class="entry-card__title">${escapeHtml(entry.title)}</h3>`
                      : `<h3 class="entry-card__title entry-card__title--muted">Basliksiz Icerik</h3>`
                  }
                </div>
                ${
                  state.isEditMode
                    ? `
                      <div class="entry-card__actions">
                        <button
                          class="ghost-button ghost-button--compact"
                          type="button"
                          data-action="move-entry"
                          data-direction="up"
                          data-section="${sectionKey}"
                          data-entry-id="${entry.id}"
                          ${
                            index === 0 || state.reorderState.active ? "disabled" : ""
                          }
                        >
                          Yukari
                        </button>
                        <button
                          class="ghost-button ghost-button--compact"
                          type="button"
                          data-action="move-entry"
                          data-direction="down"
                          data-section="${sectionKey}"
                          data-entry-id="${entry.id}"
                          ${
                            index === entries.length - 1 || state.reorderState.active ? "disabled" : ""
                          }
                        >
                          Asagi
                        </button>
                        <button class="ghost-button" type="button" data-action="edit-entry" data-section="${sectionKey}" data-entry-id="${entry.id}">
                          Duzenle
                        </button>
                        <button class="danger-button" type="button" data-action="delete-entry" data-section="${sectionKey}" data-entry-id="${entry.id}">
                          Sil
                        </button>
                      </div>
                    `
                    : ""
                }
              </div>
              ${
                entry.body
                  ? `<p class="entry-card__body">${escapeHtml(entry.body).replaceAll("\n", "<br />")}</p>`
                  : ""
              }
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderManagedTab(sectionKey) {
  const section = SECTIONS[sectionKey];

  return `
    <section class="content-grid">
      <article class="admin-panel">
        <div class="admin-panel__header">
          <div>
            <p class="section-label">${escapeHtml(section.label)}</p>
            <h2 class="content-block__title">${escapeHtml(section.label)}</h2>
            <p class="content-block__lead">${escapeHtml(section.intro)}</p>
            ${renderFlashMessage()}
          </div>
          <div class="admin-actions">
            <button class="icon-button" type="button" aria-label="Icerik ekle" data-action="open-admin" data-section="${sectionKey}">
              +
            </button>
            ${
              state.isEditMode
                ? `<span class="status-pill status-pill--live">Duzenleme acik</span>
                   <button class="ghost-button" type="button" data-action="lock-edit-mode">Kilitle</button>`
                : `<span class="status-pill">${escapeHtml(state.storageLabel)}</span>`
            }
          </div>
        </div>
      </article>

      <article class="system-note">
        <p class="helper-text">${escapeHtml(state.storageHint)}</p>
      </article>

      ${renderEditor(sectionKey)}
      ${renderEntries(sectionKey)}
    </section>
  `;
}

function renderPasswordDialog() {
  return `
    <div class="dialog" ${state.showPasswordDialog ? "" : "hidden"}>
      <div class="dialog__surface">
        <div class="dialog__header">
          <div>
            <p class="section-label">Yonetici Girisi</p>
            <h2 class="dialog__title">Duzenleme kilidi</h2>
          </div>
        </div>
        <p class="muted-line">Devam etmek icin yonetici sifresini gir.</p>
        <form id="password-form" class="editor-grid">
          <div class="field">
            <label for="admin-password">Sifre</label>
            <input id="admin-password" name="password" type="password" value="${escapeHtml(state.passwordInput)}" required />
          </div>
          ${state.passwordError ? `<p class="dialog__error">${escapeHtml(state.passwordError)}</p>` : ""}
          <div class="dialog__actions">
            <button class="ghost-button" type="button" data-action="close-password-dialog">Vazgec</button>
            <button class="primary-button" type="submit">Onayla</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderApp() {
  const app = document.querySelector("#main-content");

  app.innerHTML = `
    <section class="hero">
      <div class="hero__media">
        <img src="${HERO_IMAGE}" alt="Gece sehir atmosferi" />
      </div>
      <div class="hero__overlay"></div>
      <div class="hero__content">
        <div class="hero__copy">
          <p class="section-label">Anthony Morgan</p>
          <h1 class="hero__title">Anthony Morgan</h1>
          <p class="hero__lead">
            Hikaye, karakter gelisimi ve isletmeler icin gorsel ve metin bloklari burada yonetilir.
          </p>
        </div>

        <aside class="hero__meta-card">
          <dl class="meta-list">
            <div class="meta-list__item">
              <dt>Aktif Sekme</dt>
              <dd>${escapeHtml(SECTIONS[state.activeTab].label)}</dd>
            </div>
            <div class="meta-list__item">
              <dt>Kayit Modu</dt>
              <dd>${escapeHtml(state.storageLabel)}</dd>
            </div>
            <div class="meta-list__item">
              <dt>Duzenleme</dt>
              <dd>${state.isEditMode ? "Yonetici modu acik" : "Yonetici kilidi aktif"}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>

    <section class="tabs">
      <div class="tabs__list" role="tablist" aria-label="Anthony Morgan site sekmeleri">
        ${Object.entries(SECTIONS)
          .map(
            ([id, config]) => `
              <button
                class="tab-button"
                type="button"
                role="tab"
                id="tab-${id}"
                aria-selected="${state.activeTab === id}"
                aria-controls="panel-${id}"
                data-tab="${id}"
              >
                ${escapeHtml(config.label)}
              </button>
            `
          )
          .join("")}
      </div>

      <div class="tab-panel" role="tabpanel" id="panel-${state.activeTab}" aria-labelledby="tab-${state.activeTab}">
        ${renderManagedTab(state.activeTab)}
      </div>
    </section>

    ${renderPasswordDialog()}
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      clearFlashMessage();
      clearSaveState();
      state.activeTab = button.dataset.tab;
      renderApp();
    });
  });

  document.querySelectorAll("[data-action='open-admin']").forEach((button) => {
    button.addEventListener("click", () => {
      clearFlashMessage();
      clearSaveState();
      const sectionKey = button.dataset.section || state.activeTab;

      if (state.isEditMode) {
        startCreatingEntry(sectionKey);
        return;
      }

      state.editorSection = sectionKey;
      state.showPasswordDialog = true;
      state.passwordInput = "";
      state.passwordError = "";
      renderApp();
      document.querySelector("#admin-password")?.focus();
    });
  });

  document.querySelectorAll("[data-action='close-password-dialog']").forEach((button) => {
    button.addEventListener("click", () => {
      state.showPasswordDialog = false;
      state.passwordInput = "";
      state.passwordError = "";
      renderApp();
    });
  });

  document.querySelectorAll("[data-action='lock-edit-mode']").forEach((button) => {
    button.addEventListener("click", () => {
      state.isEditMode = false;
      state.adminPassword = "";
      state.editorMode = null;
      state.editorSection = null;
      state.editingId = null;
      state.draft = blankEntry();
      setFlashMessage("Duzenleme kilidi yeniden kapatildi.");
      clearSaveState();
      renderApp();
    });
  });

  document.querySelectorAll("[data-action='cancel-editor']").forEach((button) => {
    button.addEventListener("click", () => {
      state.editorMode = null;
      state.editingId = null;
      state.draft = blankEntry();
      clearSaveState();
      renderApp();
    });
  });

  document.querySelectorAll("[data-action='remove-image']").forEach((button) => {
    button.addEventListener("click", () => {
      state.draft.imageDataUrl = "";
      state.draft.imageAlt = "";
      renderApp();
    });
  });

  document.querySelectorAll("[data-action='edit-entry']").forEach((button) => {
    button.addEventListener("click", () => {
      clearFlashMessage();
      const sectionKey = button.dataset.section;
      const entry = state.sections[sectionKey].find((item) => item.id === button.dataset.entryId);
      if (!entry) {
        return;
      }

      state.activeTab = sectionKey;
      state.editorMode = "edit";
      state.editorSection = sectionKey;
      state.editingId = entry.id;
      state.draft = {
        title: entry.title || "",
        body: entry.body || "",
        imageDataUrl: entry.imageDataUrl || "",
        imageAlt: entry.imageAlt || "",
      };
      clearSaveState();
      renderApp();
    });
  });

  document.querySelectorAll("[data-action='delete-entry']").forEach((button) => {
    button.addEventListener("click", async () => {
      clearFlashMessage();
      const sectionKey = button.dataset.section;
      const entryId = button.dataset.entryId;

      try {
        await deleteEntryFromStorage(sectionKey, entryId);
        setFlashMessage("Icerik silindi.");
      } catch (error) {
        setFlashMessage(error.message || "Icerik silinemedi.");
      }

      if (state.editingId === entryId) {
        state.editorMode = null;
        state.editingId = null;
        state.draft = blankEntry();
      }

      renderApp();
    });
  });

  document.querySelectorAll("[data-action='move-entry']").forEach((button) => {
    button.addEventListener("click", async () => {
      if (state.reorderState.active) {
        return;
      }

      clearFlashMessage();
      clearSaveState();

      const sectionKey = button.dataset.section;
      const entryId = button.dataset.entryId;
      const direction = button.dataset.direction;
      const previousSections = structuredClone(state.sections);
      const moved = moveEntryLocally(sectionKey, entryId, direction);

      if (!moved) {
        return;
      }

      setReorderState(true, sectionKey, entryId, direction);
      renderApp();

      try {
        await moveEntryInStorage(sectionKey, entryId, direction);
        setFlashMessage(direction === "up" ? "Icerik yukariya tasindi." : "Icerik asagiya tasindi.");
      } catch (error) {
        state.sections = previousSections;
        setFlashMessage(error.message || "Icerik tasinamadi.");
      } finally {
        setReorderState(false);
      }

      renderApp();
    });
  });

  const passwordForm = document.querySelector("#password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(passwordForm);
      const password = String(formData.get("password") ?? "");

      const verified =
        state.storageMode === "cloud" ? await verifyAdminPassword(password) : password === "anthony-admin";

      if (!verified) {
        state.passwordError = "Sifre yanlis.";
        state.passwordInput = password;
        renderApp();
        return;
      }

      state.adminPassword = password;
      state.isEditMode = true;
      state.showPasswordDialog = false;
      state.passwordError = "";
      state.passwordInput = "";
      setFlashMessage("Duzenleme kilidi acildi.");
      clearSaveState();
      startCreatingEntry(state.editorSection || state.activeTab);
    });
  }

  const imageInput = document.querySelector("#entry-image");
  if (imageInput) {
    imageInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      state.draft.imageDataUrl = dataUrl;
      state.draft.imageAlt = state.draft.imageAlt || file.name.replace(/\.[^.]+$/, "");
      renderApp();
    });
  }

  const contentForm = document.querySelector("#content-form");
  if (contentForm) {
    contentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFlashMessage();
      const formData = new FormData(contentForm);
      const nextEntry = {
        title: String(formData.get("title") ?? "").trim(),
        body: String(formData.get("body") ?? "").trim(),
        imageAlt: String(formData.get("imageAlt") ?? "").trim(),
        imageDataUrl: state.draft.imageDataUrl || "",
      };

      if (!nextEntry.title && !nextEntry.body && !nextEntry.imageDataUrl) {
        setFlashMessage("En az bir baslik, metin veya gorsel eklemelisin.");
        setSaveState("error", "Kayit baslatilmadi.");
        renderApp();
        return;
      }

      state.draft = { ...nextEntry };
      setSaveState("saving", "Kayit gonderiliyor...");
      renderApp();

      try {
        await saveEntryToStorage(state.editorSection, state.editorMode, nextEntry, state.editingId);
        setFlashMessage(state.editorMode === "create" ? "Yeni icerik eklendi." : "Icerik guncellendi.");
        setSaveState("success", "Kayit tamamlandi.");
        state.editorMode = null;
        state.editingId = null;
        state.draft = blankEntry();
      } catch (error) {
        setFlashMessage(error.message || "Icerik kaydedilemedi.");
        setSaveState("error", error.message || "Icerik kaydedilemedi.");
      }

      renderApp();
    });
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gorsel okunamadi."));
    reader.readAsDataURL(file);
  });
}

function startCreatingEntry(sectionKey) {
  state.activeTab = sectionKey;
  state.editorMode = "create";
  state.editorSection = sectionKey;
  state.editingId = null;
  state.draft = blankEntry();
  clearSaveState();
  renderApp();
}

async function init() {
  await loadSections();
  renderApp();
}

init();
