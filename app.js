
const STORAGE_KEY = "jobclock.jobs.v3";
const ACTIVE_KEY = "jobclock.active.v3";
const DB_NAME = "jobclock-media";
const DB_VERSION = 1;
const PHOTO_STORE = "photos";
const EASTERN_TZ = "America/New_York";

const customerNameEl = document.getElementById("customerName");
const phoneNumberEl = document.getElementById("phoneNumber");
const itemsUsedEl = document.getElementById("itemsUsed");
const jobNotesEl = document.getElementById("jobNotes");
const mainButton = document.getElementById("mainButton");
const mainButtonText = document.getElementById("mainButtonText");
const mainButtonIcon = document.getElementById("mainButtonIcon");
const helperText = document.getElementById("helperText");
const statusPill = document.getElementById("statusPill");
const timePanel = document.getElementById("timePanel");
const startedTime = document.getElementById("startedTime");
const stoppedTime = document.getElementById("stoppedTime");
const activePhotos = document.getElementById("activePhotos");
const activePhotoInput = document.getElementById("activePhotoInput");
const activePhotoStrip = document.getElementById("activePhotoStrip");
const activePhotoCount = document.getElementById("activePhotoCount");
const jobList = document.getElementById("jobList");
const emptyState = document.getElementById("emptyState");
const exportAllButton = document.getElementById("exportAllButton");
const template = document.getElementById("jobTemplate");
const toast = document.getElementById("toast");

let jobs = loadJSON(STORAGE_KEY, []);
let active = loadJSON(ACTIVE_KEY, null);
let dbPromise = openDatabase();

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function easternDateTime(timestamp) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  }).format(new Date(timestamp));
}

function easternTime(timestamp) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  }).format(new Date(timestamp));
}

function easternDate(timestamp) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(timestamp));
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 2200);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        const store = db.createObjectStore(PHOTO_STORE, { keyPath: "id" });
        store.createIndex("jobId", "jobId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePhoto(photo) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    tx.objectStore(PHOTO_STORE).put(photo);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getPhotos(jobId) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readonly");
    const req = tx.objectStore(PHOTO_STORE).index("jobId").getAll(jobId);
    req.onsuccess = () => resolve(req.result.sort((a,b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

async function deletePhotos(jobId) {
  const db = await dbPromise;
  const photos = await getPhotos(jobId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    const store = tx.objectStore(PHOTO_STORE);
    photos.forEach(photo => store.delete(photo.id));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

async function compressPhoto(file) {
  const img = await loadImage(file);
  const maxSide = 1500;
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.76),
    width,
    height
  };
}

async function addPhotoFiles(jobId, files) {
  if (!jobId || !files.length) return;
  showToast(`Adding ${files.length} photo${files.length === 1 ? "" : "s"}…`);

  for (const file of files) {
    try {
      const compressed = await compressPhoto(file);
      await savePhoto({
        id: uid(),
        jobId,
        dataUrl: compressed.dataUrl,
        width: compressed.width,
        height: compressed.height,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error(err);
      showToast("One photo could not be added");
    }
  }

  await updateUI();
  showToast("Photos saved");
}

function startJob() {
  const name = customerNameEl.value.trim();
  if (!name) return;

  active = {
    id: uid(),
    customerName: name,
    phoneNumber: phoneNumberEl.value.trim(),
    itemsUsed: itemsUsedEl.value.trim(),
    notes: jobNotesEl.value.trim(),
    startedAt: Date.now()
  };

  saveJSON(ACTIVE_KEY, active);
  updateUI();
}

async function stopJob() {
  if (!active) return;

  const endedAt = Date.now();
  const finished = {
    id: active.id,
    customerName: active.customerName,
    phoneNumber: phoneNumberEl.value.trim(),
    itemsUsed: itemsUsedEl.value.trim(),
    notes: jobNotesEl.value.trim(),
    startedAt: active.startedAt,
    endedAt
  };

  jobs.unshift(finished);
  saveJSON(STORAGE_KEY, jobs);
  localStorage.removeItem(ACTIVE_KEY);
  active = null;

  customerNameEl.value = "";
  phoneNumberEl.value = "";
  itemsUsedEl.value = "";
  jobNotesEl.value = "";
  await updateUI();
  showToast("Job saved");
}

mainButton.addEventListener("click", () => {
  active ? stopJob() : startJob();
});

customerNameEl.addEventListener("input", () => updateUI());

for (const el of [phoneNumberEl, itemsUsedEl, jobNotesEl]) {
  el.addEventListener("input", () => {
    if (!active) return;
    active.phoneNumber = phoneNumberEl.value.trim();
    active.itemsUsed = itemsUsedEl.value.trim();
    active.notes = jobNotesEl.value.trim();
    saveJSON(ACTIVE_KEY, active);
  });
}

activePhotoInput.addEventListener("change", async event => {
  if (!active) return;
  const files = [...event.target.files];
  event.target.value = "";
  await addPhotoFiles(active.id, files);
});

exportAllButton.addEventListener("click", async () => {
  await exportJobsToPDF(jobs, "JobClock-All-Jobs.pdf");
});

async function renderPhotoStrip(container, photos) {
  container.innerHTML = "";
  photos.forEach(photo => {
    const img = document.createElement("img");
    img.className = "photo-thumb";
    img.alt = "Job photo";
    img.src = photo.dataUrl;
    container.appendChild(img);
  });
}

async function renderJobs() {
  jobList.innerHTML = "";
  emptyState.hidden = jobs.length > 0;
  exportAllButton.hidden = jobs.length === 0;

  for (const job of jobs) {
    const node = template.content.cloneNode(true);
    const notes = node.querySelector(".job-notes");
    const items = node.querySelector(".job-items");
    const notesBlock = node.querySelector(".notes-block");
    const itemsBlock = node.querySelector(".items-block");
    const photoStrip = node.querySelector(".job-photo-strip");
    const countEl = node.querySelector(".job-photo-count");

    node.querySelector(".job-title").textContent = job.customerName || "Untitled Job";
    node.querySelector(".job-phone").textContent = job.phoneNumber || "No phone number";
    node.querySelector(".job-date").textContent = easternDate(job.startedAt);
    node.querySelector(".job-start").textContent = easternTime(job.startedAt);
    node.querySelector(".job-stop").textContent = easternTime(job.endedAt);

    if (job.itemsUsed) items.textContent = job.itemsUsed;
    else itemsBlock.remove();

    if (job.notes) notes.textContent = job.notes;
    else notesBlock.remove();

    const photos = await getPhotos(job.id);
    countEl.textContent = `${photos.length} photo${photos.length === 1 ? "" : "s"}`;
    await renderPhotoStrip(photoStrip, photos);

    node.querySelector(".job-photo-input").addEventListener("change", async event => {
      const files = [...event.target.files];
      event.target.value = "";
      await addPhotoFiles(job.id, files);
    });

    node.querySelector(".pdf-button").addEventListener("click", async () => {
      const safe = (job.customerName || "Job").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "");
      await exportJobsToPDF([job], `${safe || "JobClock"}-Report.pdf`);
    });

    node.querySelector(".delete-button").addEventListener("click", async () => {
      if (!confirm(`Delete "${job.customerName}" and its photos?`)) return;
      jobs = jobs.filter(item => item.id !== job.id);
      saveJSON(STORAGE_KEY, jobs);
      await deletePhotos(job.id);
      await renderJobs();
      showToast("Job deleted");
    });

    jobList.appendChild(node);
  }
}

async function updateUI() {
  const isRunning = Boolean(active);

  if (isRunning) {
    customerNameEl.value = active.customerName || "";
    phoneNumberEl.value = active.phoneNumber || "";
    itemsUsedEl.value = active.itemsUsed || "";
    jobNotesEl.value = active.notes || "";
  }

  customerNameEl.disabled = isRunning;
  mainButton.disabled = !isRunning && customerNameEl.value.trim().length === 0;
  mainButton.classList.toggle("stop", isRunning);
  mainButtonText.textContent = isRunning ? "Stop Job" : "Start Job";
  mainButtonIcon.textContent = isRunning ? "■" : "▶";
  statusPill.textContent = isRunning ? "Job Active" : "Ready";
  statusPill.classList.toggle("running", isRunning);

  timePanel.hidden = !isRunning;
  activePhotos.hidden = !isRunning;

  if (isRunning) {
    startedTime.textContent = easternDateTime(active.startedAt);
    stoppedTime.textContent = "Not finished";
    helperText.textContent = "Stop Job records the current Eastern Time and saves the job.";
    const photos = await getPhotos(active.id);
    activePhotoCount.textContent = `${photos.length} photo${photos.length === 1 ? "" : "s"}`;
    await renderPhotoStrip(activePhotoStrip, photos);
  } else {
    helperText.textContent = "Start and stop times are recorded in Eastern Time.";
    activePhotoStrip.innerHTML = "";
  }

  await renderJobs();
}

// ---------- Self-contained PDF generator ----------

const encoder = new TextEncoder();

function ascii(text) {
  return String(text ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");
}

function pdfEscape(text) {
  return ascii(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text, maxChars = 78) {
  const paragraphs = String(text || "").split(/\n/);
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(",")[1];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function joinBytes(parts) {
  let total = 0;
  const normalized = parts.map(part => {
    if (typeof part === "string") part = encoder.encode(part);
    total += part.length;
    return part;
  });
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of normalized) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function buildPdf(objects) {
  const chunks = [encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = [0];
  let position = chunks[0].length;

  objects.forEach((body, index) => {
    offsets[index + 1] = position;
    const header = encoder.encode(`${index + 1} 0 obj\n`);
    const footer = encoder.encode("\nendobj\n");
    const bodyBytes = typeof body === "function" ? body() : encoder.encode(body);
    chunks.push(header, bodyBytes, footer);
    position += header.length + bodyBytes.length + footer.length;
  });

  const xrefOffset = position;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer =
    `${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encoder.encode(trailer));
  return new Blob(chunks, { type: "application/pdf" });
}

async function exportJobsToPDF(selectedJobs, filename) {
  if (!selectedJobs.length) return;
  showToast("Building PDF…");

  const objects = [];
  const addObject = body => {
    objects.push(body);
    return objects.length;
  };

  // Reserve catalog + pages
  addObject("PLACEHOLDER_CATALOG");
  addObject("PLACEHOLDER_PAGES");

  const fontRegular = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const pageRefs = [];

  function addPage(content, imageDefs = []) {
    const xObjects = [];
    for (const img of imageDefs) {
      const bytes = dataUrlToBytes(img.dataUrl);
      const imageObj = addObject(() => joinBytes([
        `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,
        bytes,
        "\nendstream"
      ]));
      xObjects.push({ name: img.name, obj: imageObj });
    }

    const contentBytes = encoder.encode(content);
    const contentObj = addObject(() => joinBytes([
      `<< /Length ${contentBytes.length} >>\nstream\n`,
      contentBytes,
      "\nendstream"
    ]));

    const xobjDict = xObjects.length
      ? `/XObject << ${xObjects.map(x => `/${x.name} ${x.obj} 0 R`).join(" ")} >>`
      : "";

    const pageObj = addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> ${xobjDict} >> ` +
      `/Contents ${contentObj} 0 R >>`
    );
    pageRefs.push(pageObj);
  }

  for (let jobIndex = 0; jobIndex < selectedJobs.length; jobIndex++) {
    const job = selectedJobs[jobIndex];
    const photos = await getPhotos(job.id);

    let y = 744;
    const cmds = [];

    const text = (value, x, size = 10, bold = false) => {
      cmds.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`);
      y -= size + 6;
    };

    text("JOBCLOCK FIELD REPORT", 50, 18, true);
    y -= 8;
    text(`Customer: ${job.customerName || ""}`, 50, 13, true);
    text(`Phone: ${job.phoneNumber || ""}`, 50, 10);
    text(`Date: ${easternDate(job.startedAt)}`, 50, 10);
    text(`Start: ${easternDateTime(job.startedAt)}`, 50, 10);
    text(`Stop: ${easternDateTime(job.endedAt)}`, 50, 10);

    y -= 8;
    text("ITEMS USED", 50, 11, true);
    const itemLines = wrapText(job.itemsUsed || "None listed");
    for (const line of itemLines) text(line, 50, 10);

    y -= 8;
    text("NOTES", 50, 11, true);
    const noteLines = wrapText(job.notes || "None");
    for (const line of noteLines) text(line, 50, 10);

    y -= 8;
    text(`Photos attached: ${photos.length}`, 50, 10, true);
    addPage(cmds.join("\n"));

    for (let i = 0; i < photos.length; i += 2) {
      const batch = photos.slice(i, i + 2);
      const imageDefs = [];
      const imageCommands = [];
      let topY = 720;

      batch.forEach((photo, idx) => {
        const maxW = 512;
        const maxH = 300;
        const scale = Math.min(maxW / photo.width, maxH / photo.height);
        const w = photo.width * scale;
        const h = photo.height * scale;
        const x = (612 - w) / 2;
        const yPos = topY - h;
        const name = `Im${jobIndex}_${i + idx}`;
        imageDefs.push({ ...photo, name });

        imageCommands.push(
          `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${yPos.toFixed(2)} cm /${name} Do Q`
        );
        imageCommands.push(
          `BT /F1 9 Tf 50 ${(yPos - 18).toFixed(2)} Td ` +
          `(${pdfEscape(`${job.customerName} - Photo ${i + idx + 1}`)}) Tj ET`
        );
        topY = yPos - 55;
      });

      addPage(imageCommands.join("\n"), imageDefs);
    }
  }

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map(n => `${n} 0 R`).join(" ")}] >>`;

  const blob = buildPdf(objects);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 30000);
  showToast("PDF ready");
}

if (active) {
  customerNameEl.value = active.customerName || "";
  phoneNumberEl.value = active.phoneNumber || "";
  itemsUsedEl.value = active.itemsUsed || "";
  jobNotesEl.value = active.notes || "";
}

updateUI();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}
