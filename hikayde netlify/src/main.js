import { anthonyMorgan } from "./content/anthonyMorgan.js";

const app = document.querySelector("#main-content");
const createSectionId = (value) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const renderHero = (content) => `
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero__media">
      <img
        class="hero__image"
        src="${content.heroImage}"
        alt="Gece Los Santos atmosferini taşıyan sinematik şehir manzarası"
      />
    </div>
    <div class="hero__content">
      <div class="hero__copy">
        <p class="section-label">Karakter Dosyası</p>
        <h1 id="hero-title">${content.name}</h1>
        <p class="hero__identity">${content.identityLine}</p>
        <ul class="hero__details">
          <li><strong>Doğum:</strong> ${content.basics.birthDate}</li>
          <li><strong>Doğum Yeri:</strong> ${content.basics.birthplace}</li>
          <li><strong>Eğitim:</strong> ${content.basics.education}</li>
          <li><strong>Polislik:</strong> ${content.basics.policeCareer}</li>
          <li><strong>Pond Kafe:</strong> ${content.basics.pondConnection}</li>
        </ul>
        <blockquote class="hero__quote">
          <p>"${content.quote}"</p>
          <cite>Hikâyedeki kanonik çizgiden alınmıştır.</cite>
        </blockquote>
      </div>

      <aside class="hero-card panel" aria-label="Hızlı dosya özeti">
        <p class="hero-card__title">Hızlı Bakış</p>
        <dl class="hero-card__stats">
          <div>
            <dt>Kimlik</dt>
            <dd>Columbia mezunu, eski polis</dd>
          </div>
          <div>
            <dt>Şehir</dt>
            <dd>Los Angeles'tan Los Santos'a</dd>
          </div>
          <div>
            <dt>Bağlılık</dt>
            <dd>Ryan, Evelyn, Luca</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>Pond Kafe'de destek ve denge unsuru</dd>
          </div>
        </dl>
      </aside>
    </div>
  </section>
`;

const renderProfile = (content) => `
  <section class="section" aria-labelledby="dossier-title">
    <div class="section__inner">
      <div class="profile-layout">
        <article class="profile-card panel">
          <p class="section-label">Dosya Kartı</p>
          <h2 class="section-heading" id="dossier-title">Karakter Profili</h2>
          <p class="profile-card__lead">
            Anthony'nin karakter dosyası; hikâyede açıkça verilen kimlik, geçmiş ve rol bilgilerine göre düzenlendi.
          </p>
          <dl class="profile-card__grid">
            ${content.dossierFacts
              .map(
                ([label, value]) => `
                  <div>
                    <dt>${label}</dt>
                    <dd>${value}</dd>
                  </div>
                `
              )
              .join("")}
          </dl>
        </article>

        <div class="summary-stack">
          <article class="summary-block panel" aria-labelledby="summary-title">
            <p class="section-label">Kısa Özet</p>
            <h2 class="section-heading" id="summary-title">Karakter Özeti</h2>
            ${content.summary.map((paragraph) => `<p>${paragraph}</p>`).join("")}
          </article>
        </div>
      </div>
    </div>
  </section>
`;

const renderTimeline = (content) => `
  <section class="section" aria-labelledby="timeline-title">
    <div class="section__inner">
      <p class="section-label">Kronoloji</p>
      <h2 class="section-heading" id="timeline-title">Zaman Çizelgesi</h2>
      <p class="section-intro">
        Bu akış yalnızca hikâyede yer alan kronolojiye dayanır; belirtilmeyen hiçbir tarih veya olay eklenmemiştir.
      </p>
      <ol class="timeline">
        ${content.timeline
          .map(
            (item) => `
              <li class="timeline__item">
                <span class="timeline__marker">${item.marker}</span>
                <h3 class="timeline__title">${item.title}</h3>
                <p class="timeline__text">${item.text}</p>
              </li>
            `
          )
          .join("")}
      </ol>
    </div>
  </section>
`;

const renderCardGrid = ({ label, title, intro, items, className = "" }) => `
  <section class="section" aria-labelledby="${createSectionId(title)}">
    <div class="section__inner">
      <p class="section-label">${label}</p>
      <h2 class="section-heading" id="${createSectionId(title)}">${title}</h2>
      <p class="section-intro">${intro}</p>
      <div class="card-grid ${className}">
        ${items
          .map(
            (item) => `
              <article class="card">
                <h3 class="card__title">${item.name ?? item.title}</h3>
                <p class="card__subtitle">${item.subtitle}</p>
                <p class="card__text">${item.text}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  </section>
`;

const renderStory = (content) => `
  <section class="section" aria-labelledby="story-title">
    <div class="section__inner">
      <p class="section-label">Tam Metin</p>
      <h2 class="section-heading" id="story-title">Tam Hikâye</h2>
      <p class="section-intro">
        Aşağıdaki metin, sağlanan hikâyenin anlamı değiştirilmeden paragraf blokları halinde yerleştirilmiştir.
      </p>

      <div class="story-layout">
        <article class="story-meta">
          ${content.storyMeta.map((line) => `<p>${line}</p>`).join("")}
        </article>
        ${chunkArray(content.storyParagraphs, 6)
          .map(
            (group, index) => `
              <article class="story-block">
                <span class="story-block__index">Bölüm ${index + 1}</span>
                ${group.map((paragraph) => `<p>${paragraph}</p>`).join("")}
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  </section>
`;

app.innerHTML = [
  renderHero(anthonyMorgan),
  renderProfile(anthonyMorgan),
  renderTimeline(anthonyMorgan),
  renderCardGrid({
    label: "İlişkiler",
    title: "İlişki Dosyası",
    intro:
      "Ryan, Evelyn, Luca ve Pond Kafe; Anthony'nin seçilmiş ailesini ve Los Santos'taki varlık nedenini tanımlayan ana bağlardır.",
    items: anthonyMorgan.relationships,
  }),
  renderCardGrid({
    label: "Özellikler ve Beceriler",
    title: "Özellikler ve Beceriler",
    intro:
      "Bu kartlar hikâyede açıkça anlatılan kişilik, yetenek ve davranış çizgisini toplar.",
    items: anthonyMorgan.traits,
    className: "traits-grid",
  }),
  renderStory(anthonyMorgan),
].join("");
