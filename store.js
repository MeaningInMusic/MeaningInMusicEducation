const MIM_API = "instruments.php";
const MIM_SITE_API = "site.php";
const MIM_STORAGE_KEY = "mim_instruments"; // local fallback only
const MIM_EMAIL_KEY = "mim_admin_email"; // session-only admin login
const MIM_PASSWORD_KEY = "mim_admin_pass"; // session-only admin login
const MIM_CONDITION_CLASS = { Good: "condition-good", Fair: "condition-fair", Great: "condition-great" };

let MIM_MODE = null; // "server" | "local", detected once

// Default catalog seeded on first run (server instruments.json lists the same items).
const MIM_SEEDS = [
  {
    id: "seed_violin",
    createdAt: "2025",
    name: "Violin (½ size)",
    condition: "Good",
    images: [],
    manufacturer: "Stentor (student model)",
    year: "2017",
    description:
      "A sweet, warm-sounding half-size violin that's ideal for young beginners. Small enough to hold comfortably and light enough to build good posture from day one.",
    notes:
      "Some wear on the chin rest. Strings recently replaced and the bow rehaired last year. Plays clearly across all four strings.",
    details: ["½ size — easy for younger players", "Includes bow, case, and rosin", "Tuned and set up before lending"],
  },
  {
    id: "seed_keyboard",
    createdAt: "2025",
    name: "Keyboard (61-key)",
    condition: "Great",
    images: [],
    manufacturer: "Casio (CT series)",
    year: "2021",
    description:
      "A lightweight 61-key keyboard with a range of built-in sounds, a headphone jack, and simple controls. Perfect first instrument for exploring piano and composition.",
    notes: "Very lightly used — all keys and speakers working. No stand or sustain pedal included.",
    details: ["61 unweighted keys with touch response", "Headphone jack for quiet practice", "Power adapter included"],
  },
  {
    id: "seed_guitar",
    createdAt: "2025",
    name: "Acoustic Guitar",
    condition: "Fair",
    images: [],
    manufacturer: "Yamaha (F-series)",
    year: "2015",
    description:
      "A full-size steel-string dreadnought with a rich, projecting tone. Great for campfire songs, strumming, and learning chords.",
    notes:
      "Some dings on the body and a small scratch on the top — cosmetic only. Fresh strings fitted and the action checked, so it plays comfortably.",
    details: ["Full-size dreadnought body", "Fresh strings and low action", "Includes gig bag and clip-on tuner"],
  },
  {
    id: "seed_flute",
    createdAt: "2025",
    name: "Student Flute",
    condition: "Good",
    images: [],
    manufacturer: "Gemeinhardt (student model)",
    year: "2019",
    description:
      "A reliable student flute with a clear, bright tone. Closed-hole keys make it forgiving for first-timers learning hand position and embouchure.",
    notes: "Pads recently checked and adjusted; a few minor scratches on the body. Includes case and cleaning kit.",
    details: ["Closed-hole — ideal for beginners", "Clear tone across registers", "Includes case and cleaning kit"],
  },
];

// ---- Detect where listings live: on the server (GoDaddy/PHP) or in this browser ----
async function mimInit() {
  if (MIM_MODE) return MIM_MODE;
  try {
    const res = await fetch(MIM_API + "?probe=1", { cache: "no-store" });
    const data = await res.json();
    MIM_MODE = data && data.ok ? "server" : "local";
  } catch (e) {
    MIM_MODE = "local";
  }
  return MIM_MODE;
}

// ---- Local fallback helpers (used when opened without PHP, e.g. file://) ----
function mimLocalGet() {
  try {
    return JSON.parse(localStorage.getItem(MIM_STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function mimLocalSave(items) {
  try {
    localStorage.setItem(MIM_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {}
}

function mimLocalAdd(item) {
  const items = mimLocalGet();
  if (items.length === 0) {
    items.push.apply(items, MIM_SEEDS.map((s) => Object.assign({}, s)));
  }
  item.id = "local_" + String(Date.now());
  item.createdAt = new Date().toLocaleDateString();
  items.unshift(item);
  mimLocalSave(items);
  return item;
}

function mimLocalUpdate(id, patch) {
  mimLocalSave(mimLocalGet().map((it) => (it.id === id ? Object.assign({}, it, patch) : it)));
}

function mimLocalRemove(id) {
  mimLocalSave(mimLocalGet().filter((it) => it.id !== id));
}

function mimLocalAll() {
  let items = mimLocalGet();
  if (items.length === 0) {
    items = MIM_SEEDS.map((s) => Object.assign({}, s));
    mimLocalSave(items);
  }
  return items;
}

// ---- Admin sessions & server requests ----
function mimCreds() {
  const email = sessionStorage.getItem(MIM_EMAIL_KEY);
  const password = sessionStorage.getItem(MIM_PASSWORD_KEY);
  if (!email || !password) return null;
  return { email: email, password: password };
}

function mimIsLoggedIn() {
  return mimCreds() != null;
}

// Verify email + password against the server and keep the session for this tab.
async function mimLogin(email, password) {
  const data = await mimRequest({ action: "auth", email: email, password: password });
  sessionStorage.setItem(MIM_EMAIL_KEY, email);
  sessionStorage.setItem(MIM_PASSWORD_KEY, password);
  return data;
}

function mimLogout() {
  sessionStorage.removeItem(MIM_EMAIL_KEY);
  sessionStorage.removeItem(MIM_PASSWORD_KEY);
}

async function mimRequest(body) {
  const payload = Object.assign({}, body);
  const creds = mimCreds();
  if (creds) {
    payload.email = creds.email;
    payload.password = creds.password;
  }
  const res = await fetch(MIM_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data && data.error === "wrong_password") {
      mimLogout();
      throw new Error("Wrong email or password. Please try again.");
    }
    throw new Error((data && data.error) || "Request failed");
  }
  return data;
}

// ---- Editable site content (admin only) ----
async function mimSiteGet() {
  const res = await fetch(MIM_SITE_API + "?get=1", { cache: "no-store" });
  if (!res.ok) throw new Error("Couldn't load site content (server needed).");
  return res.json();
}

async function mimSiteSave(fields) {
  const creds = mimCreds();
  if (!creds) throw new Error("Please sign in first.");
  const res = await fetch(MIM_SITE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: creds.email, password: creds.password, fields: fields }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data && data.error === "wrong_password") {
      mimLogout();
      throw new Error("Wrong email or password.");
    }
    throw new Error((data && data.error) || "Save failed");
  }
  return data;
}

// ---- Public API ----
async function mimFetchAll() {
  await mimInit();
  if (MIM_MODE === "server") {
    const res = await fetch(MIM_API, { cache: "no-store" });
    if (res.ok) return await res.json();
    return [];
  }
  return mimLocalAll();
}

async function mimCreate(item) {
  await mimInit();
  if (MIM_MODE === "server") {
    const data = await mimRequest(Object.assign({ action: "create" }, item));
    return data.item;
  }
  return mimLocalAdd(item);
}

async function mimUpdate(id, item) {
  await mimInit();
  if (MIM_MODE === "server") {
    await mimRequest(Object.assign({ action: "update", id: id }, item));
    return;
  }
  mimLocalUpdate(id, item);
}

async function mimDelete(id) {
  await mimInit();
  if (MIM_MODE === "server") {
    await mimRequest({ action: "delete", id: id });
    return;
  }
  mimLocalRemove(id);
}

async function mimFetchOne(id) {
  const all = await mimFetchAll();
  return all.find((it) => String(it.id) === String(id)) || null;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mimFirstImage(it) {
  if (it && Array.isArray(it.images) && it.images.length) {
    return String(it.images[0]);
  }
  if (it && it.image) {
    return String(it.image);
  }
  return "";
}

function mimCardHTML(it) {
  const cls = MIM_CONDITION_CLASS[it.condition] || "condition-good";
  const thumb = mimFirstImage(it)
    ? '<img class="catalog-thumb" src="' + esc(mimFirstImage(it)) + '" alt="' + esc(it.name) + '" loading="lazy" />'
    : '<div class="mock-image">No photo yet</div>';
  const metaBits = [];
  if (it.manufacturer) metaBits.push(esc(it.manufacturer));
  if (it.year) metaBits.push(esc(it.year));
  const meta = metaBits.length
    ? '<div class="catalog-meta">' + metaBits.join(" &middot; ") + "</div>"
    : "";
  return (
    '<a class="card instrument-card catalog-card reveal" href="instrument.html?id=' +
    encodeURIComponent(it.id) +
    '">' +
    thumb +
    '<div class="instrument-head">' +
    "<h3>" + esc(it.name) + "</h3>" +
    '<span class="condition ' + cls + '">' + esc(it.condition) + " condition</span>" +
    "</div>" +
    meta +
    "</a>"
  );
}

function mimDetailHTML(it) {
  const cls = MIM_CONDITION_CLASS[it.condition] || "condition-good";
  const images = (Array.isArray(it.images) ? it.images : []).filter(Boolean);
  if (it.image && images.indexOf(String(it.image)) === -1) images.unshift(String(it.image));

  const mainImage = images.length
    ? '<img id="galleryMain" class="gallery-main" src="' + esc(images[0]) + '" alt="' + esc(it.name) + '" />'
    : '<div class="mock-image" style="height:380px">No photo yet</div>';

  const thumbs = images.length
    ? '<div class="gallery-thumbs">' +
      images
        .map(function (src, i) {
          return (
            '<img class="gallery-thumb' + (i === 0 ? " active" : "") + '" data-idx="' + i + '" src="' +
            esc(src) + '" alt="Photo ' + (i + 1) + '" />'
          );
        })
        .join("") +
      "</div>"
    : "";

  const chips = [];
  if (it.manufacturer) chips.push('<span class="chip">' + esc(it.manufacturer) + "</span>");
  if (it.year) chips.push('<span class="chip">Manufactured ' + esc(it.year) + "</span>");
  chips.push('<span class="chip condition ' + cls + '">' + esc(it.condition) + " condition</span>");

  const details =
    it.details && it.details.length
      ? '<ul class="instrument-details">' +
        it.details.filter(Boolean).map((d) => "<li>" + esc(d) + "</li>").join("") +
        "</ul>"
      : "";

  const notes = it.notes
    ? '<div class="note-callout"><strong style="display:block;margin-bottom:4px">Condition notes</strong>' +
      esc(it.notes) +
      "</div>"
    : "";

  const description = it.description
    ? "<p style='color:var(--text-dim);font-size:.98rem'>" + esc(it.description) + "</p>"
    : "";

  return (
    '<section class="detail-layout">' +
    '<div class="glass reveal" style="padding:22px">' +
    mainImage +
    thumbs +
    "</div>" +
    '<div class="reveal stagger-1">' +
    '<div class="glass" style="padding:30px">' +
    '<h1 style="font-family:var(--font-display);font-size:clamp(1.7rem,4vw,2.3rem);letter-spacing:-.02em;line-height:1.1">' +
    esc(it.name) +
    "</h1>" +
    '<div class="meta-chips">' + chips.join("") + "</div>" +
    description +
    details +
    notes +
    '<div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap">' +
    '<a href="instruments.html#apply" class="btn btn-primary">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
    "Apply to rent this instrument</a>" +
    '<a href="instruments.html" class="btn btn-ghost">Browse all instruments</a>' +
    "</div>" +
    "</div>" +
    "</div>" +
    "</section>"
  );
}