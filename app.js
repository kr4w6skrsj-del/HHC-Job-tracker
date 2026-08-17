const CREWS = ["HHBLACK","HHBLUE","HHGREEN","HHRED"];
const STORAGE_KEY = "hhc-job-tracker-v1";
const CREW_KEY = "hhc-selected-crew";

const demoJob = {
  id: "1042",
  customerId: "1883",
  customerName: "DEMO CUSTOMER",
  email: "demo@example.com",
  phone: "704-555-0142",
  lakeAddress: "Lake Norman",
  lakeState: "NC",
  lakeCity: "Denver",
  lakeZip: "28037",
  billingAddress: "123 Example Rd",
  billingState: "NC",
  billingCity: "Denver",
  billingZip: "28037",
  boat: "22' BENNINGTON",
  slipWidth: "10",
  boatRamp: "NEIGHBOR",
  slipLocation: "MAIN DOCK",
  jobNo: "1042",
  jobDay: new Date().toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric", year:"numeric"}).toUpperCase(),
  techs: "",
  callRequired: "YES",
  arrive: "",
  left: "",
  itemsUsed: "",
  workNotes: "",
  status: "Assigned",
  crew: "HHBLACK",
  photos: [],
  equipment: [{
    installed:"1/1/1993",
    liftType:"4000 LE HP2",
    color:"",
    boat:"22' BENNINGTON",
    tankNumbers:"",
    motor:"1V1M",
    motorNumber:"",
    inst:""
  }],
  history: [
    {date:"5/17/2024", lift:"4000L", techs:"A-D", description:"CONTROL - MOTOR OR SWITCH IS BAD. TAKE BOTH."},
    {date:"7/24/2023", lift:"4000 L", techs:"B-A-P", description:"NEW BANDS / ARMS / PITMANS / BRACES / CLAMPS / HOSE"},
    {date:"9/7/2016", lift:"4000 LE", techs:"CHRIS - BRYAN", description:"TRITOON CONVERSION"}
  ]
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {jobs: []};
  try { return JSON.parse(raw); } catch { return {jobs: []}; }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  pulseSaved();
}
let state = loadState();
let currentCrew = localStorage.getItem(CREW_KEY);
let currentJobId = null;

const crewGate = document.getElementById("crewGate");
const jobsView = document.getElementById("jobsView");
const jobDetail = document.getElementById("jobDetail");
const crewTitle = document.getElementById("crewTitle");
const crewBadge = document.getElementById("crewBadge");
const jobList = document.getElementById("jobList");
const syncPill = document.getElementById("syncPill");

document.querySelectorAll(".crew-btn").forEach(btn => {
  btn.addEventListener("click", () => selectCrew(btn.dataset.crew));
});
document.getElementById("switchCrewBtn").addEventListener("click", () => {
  localStorage.removeItem(CREW_KEY);
  currentCrew = null;
  showCrewGate();
});
document.getElementById("demoImportBtn").addEventListener("click", () => {
  const exists = state.jobs.some(j => j.id === demoJob.id && j.crew === currentCrew);
  if (!exists) {
    const imported = structuredClone(demoJob);
    imported.crew = currentCrew;
    imported.id = String(Date.now()).slice(-6);
    imported.jobNo = imported.id;
    state.jobs.unshift(imported);
    saveState();
  }
  renderJobs();
});
document.getElementById("backBtn").addEventListener("click", showJobs);
document.getElementById("saveDraftBtn").addEventListener("click", () => {
  saveCurrentForm("In Progress");
});
document.getElementById("completeBtn").addEventListener("click", () => {
  saveCurrentForm("Completed");
});
document.getElementById("printBtn").addEventListener("click", async () => {
  saveCurrentForm();
  const job = getCurrentJob();
  if (!job) return;

  const button = document.getElementById("printBtn");
  const oldText = button.textContent;
  button.disabled = true;
  button.textContent = "Preparing PDF…";

  try {
    const pdfBlob = await createJobPdf(job);
    const filename = buildPdfFilename(job);
    const file = new File([pdfBlob], filename, { type: "application/pdf" });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({
        files: [file],
        title: `HHC Job #${job.jobNo}`,
        text: `${job.customerName} • Job #${job.jobNo}`
      });
    } else {
      downloadBlob(pdfBlob, filename);
      alert("This browser could not open the Share sheet, so the PDF was downloaded instead.");
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
    console.error(err);
    alert("The PDF could not be shared. Please try again.");
  } finally {
    button.disabled = false;
    button.textContent = oldText;
  }
});
document.querySelectorAll(".time-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.timeTarget);
    input.value = new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
    saveCurrentForm("In Progress", true);
  });
});
document.getElementById("cameraInput").addEventListener("change", async (e) => {
  await addPhotosFromInput(e.target);
});
document.getElementById("photoLibraryInput").addEventListener("change", async (e) => {
  await addPhotosFromInput(e.target);
});

function selectCrew(crew) {
  currentCrew = crew;
  localStorage.setItem(CREW_KEY, crew);
  showJobs();
}
function showCrewGate() {
  crewGate.classList.remove("hidden");
  jobsView.classList.add("hidden");
  jobDetail.classList.add("hidden");
}
function showJobs() {
  if (!currentCrew) return showCrewGate();
  crewGate.classList.add("hidden");
  jobsView.classList.remove("hidden");
  jobDetail.classList.add("hidden");
  crewTitle.textContent = currentCrew;
  renderJobs();
}
function showJob(id) {
  currentJobId = id;
  const job = getCurrentJob();
  if (!job) return showJobs();
  jobsView.classList.add("hidden");
  crewGate.classList.add("hidden");
  jobDetail.classList.remove("hidden");
  fillForm(job);
}
function renderJobs() {
  const jobs = state.jobs.filter(j => j.crew === currentCrew);
  jobList.innerHTML = "";
  if (!jobs.length) {
    jobList.innerHTML = `
      <div class="panel" style="padding:24px;text-align:center">
        <h2>No jobs assigned</h2>
        <p class="muted">Tap “Simulate Office Import” to see the Version 1 workflow.</p>
      </div>`;
    return;
  }
  jobs.forEach(job => {
    const div = document.createElement("article");
    div.className = "job-card";
    div.innerHTML = `
      <div>
        <h3>Job #${esc(job.jobNo)} • ${esc(job.customerName)}</h3>
        <p>${esc(job.lakeCity || job.billingCity || "")}, ${esc(job.lakeState || job.billingState || "")}</p>
        <p>${esc(job.boat || "")} • ${esc(job.equipment?.[0]?.liftType || "")}</p>
      </div>
      <div class="card-actions">
        <span class="status ${statusClass(job.status)}">${esc(job.status)}</span>
        <div style="margin-top:9px"><button class="primary-btn">Open Job</button></div>
      </div>`;
    div.querySelector("button").addEventListener("click", () => showJob(job.id));
    jobList.appendChild(div);
  });
}
function statusClass(status) {
  return status === "Completed" ? "completed" : status === "In Progress" ? "progress" : "assigned";
}
function fillForm(job) {
  crewBadge.textContent = job.crew;
  document.getElementById("jobNumberTitle").textContent = `Job #${job.jobNo}`;
  setStatus(job.status);

  const fields = ["customerName","customerId","email","phone","lakeAddress","lakeState","lakeCity","lakeZip",
    "billingAddress","billingState","billingCity","billingZip","boat","slipWidth","boatRamp","slipLocation",
    "jobNo","jobDay","techs","callRequired","arrive","left","itemsUsed","workNotes"];
  fields.forEach(id => document.getElementById(id).value = job[id] ?? "");

  const equipmentBody = document.getElementById("equipmentBody");
  equipmentBody.innerHTML = "";
  (job.equipment || []).forEach(row => {
    const tr = document.createElement("tr");
    ["installed","liftType","color","boat","tankNumbers","motor","motorNumber","inst"].forEach(k => {
      const td = document.createElement("td");
      td.textContent = row[k] ?? "";
      tr.appendChild(td);
    });
    equipmentBody.appendChild(tr);
  });

  const historyBody = document.getElementById("historyBody");
  historyBody.innerHTML = "";
  (job.history || []).forEach(row => {
    const tr = document.createElement("tr");
    [row.date,row.lift,row.techs,row.description].forEach(v => {
      const td = document.createElement("td");
      td.textContent = v ?? "";
      tr.appendChild(td);
    });
    historyBody.appendChild(tr);
  });
  renderPhotos(job);
}
function getCurrentJob() {
  return state.jobs.find(j => j.id === currentJobId);
}
function saveCurrentForm(forceStatus, silent=false) {
  const job = getCurrentJob();
  if (!job) return;
  ["techs","callRequired","arrive","left","itemsUsed","workNotes"].forEach(id => {
    job[id] = document.getElementById(id).value;
  });
  if (forceStatus) job.status = forceStatus;
  saveState();
  setStatus(job.status);
  if (!silent && forceStatus === "Completed") {
    alert("Job marked completed and saved on this device.");
  }
}
function setStatus(status) {
  const el = document.getElementById("jobStatus");
  el.textContent = status;
  el.className = `status ${statusClass(status)}`;
}
function renderPhotos(job) {
  const grid = document.getElementById("photoGrid");
  grid.innerHTML = "";
  (job.photos || []).forEach((src, idx) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    card.innerHTML = `<img alt="Job photo ${idx+1}" src="${src}"><button type="button" aria-label="Remove photo">×</button>`;
    card.querySelector("button").addEventListener("click", () => {
      job.photos.splice(idx,1);
      saveState();
      renderPhotos(job);
    });
    grid.appendChild(card);
  });
}
async function addPhotosFromInput(input) {
  const files = [...(input.files || [])];
  if (!files.length) return;

  const job = getCurrentJob();
  if (!job) return;

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const dataUrl = await resizeImage(file, 1200, .78);
    job.photos.push(dataUrl);
  }
  saveState();
  renderPhotos(job);
  input.value = "";
}


const PDF_BLUE = "#0a6484";
const PDF_NAVY = "#123b6d";
const PDF_LIGHT = "#e7f0f3";
const PDF_GRID = "#aebfc7";

async function createJobPdf(job) {
  const pages = [];
  pages.push(await renderServiceSheetPage(job));

  if ((job.photos || []).length) {
    const chunks = [];
    for (let i = 0; i < job.photos.length; i += 4) {
      chunks.push(job.photos.slice(i, i + 4));
    }
    for (let i = 0; i < chunks.length; i++) {
      pages.push(await renderPhotoPage(job, chunks[i], i + 1, chunks.length));
    }
  }

  const jpegPages = pages.map(canvas => ({
    width: canvas.width,
    height: canvas.height,
    bytes: dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.94))
  }));

  return buildPdfFromJpegs(jpegPages);
}

async function renderServiceSheetPage(job) {
  const canvas = document.createElement("canvas");
  canvas.width = 1275;
  canvas.height = 1650;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const M = 46;
  const W = canvas.width - M * 2;
  let y = 42;

  // Branding
  const logo = await loadImage("./logo-flag.png");
  const logoH = 112;
  const logoW = Math.round(logo.width * (logoH / logo.height));
  ctx.drawImage(logo, M, y, logoW, logoH);

  ctx.fillStyle = PDF_NAVY;
  ctx.font = "bold 48px Arial";
  ctx.fillText("HydroHoist", M + logoW + 22, y + 55);
  ctx.font = "bold 24px Arial";
  ctx.fillText("OF THE CAROLINAS", M + logoW + 25, y + 88);

  ctx.textAlign = "right";
  ctx.font = "bold 17px Arial";
  ctx.fillText(job.crew || "", M + W, y + 34);
  ctx.font = "bold 25px Arial";
  ctx.fillText(`JOB #${safe(job.jobNo)}`, M + W, y + 68);
  ctx.textAlign = "left";

  y += 126;
  drawRule(ctx, M, y, W, 4);
  y += 18;

  // Customer top fields
  drawPairRow(ctx, M, y, W,
    "Name", job.customerName,
    "ID", job.customerId,
    0.72
  );
  y += 48;
  drawPairRow(ctx, M, y, W,
    "Email", job.email,
    "Cell Phone", job.phone,
    0.55
  );
  y += 52;

  // Address section
  drawRule(ctx, M, y, W, 3);
  y += 10;
  const colGap = 30;
  const colW = (W - colGap) / 2;
  drawSectionTitle(ctx, M, y + 24, "Lake Address");
  drawSectionTitle(ctx, M + colW + colGap, y + 24, "Billing Address");
  y += 38;

  const leftAddress = [
    ["Address", job.lakeAddress],
    ["State", job.lakeState],
    ["City", job.lakeCity],
    ["ZIP", job.lakeZip]
  ];
  const rightAddress = [
    ["Address", job.billingAddress],
    ["State", job.billingState],
    ["City", job.billingCity],
    ["ZIP", job.billingZip]
  ];
  for (let i = 0; i < 4; i++) {
    drawFieldLine(ctx, M, y, colW, leftAddress[i][0], leftAddress[i][1], 88);
    drawFieldLine(ctx, M + colW + colGap, y, colW, rightAddress[i][0], rightAddress[i][1], 88);
    y += 39;
  }

  // Boat/job info
  drawRule(ctx, M, y, W, 3);
  y += 12;
  const infoRightW = 305;
  const infoLeftW = W - infoRightW - 24;

  drawPairRow(ctx, M, y, infoLeftW,
    "Boat / PWC", job.boat,
    "Slip Width", job.slipWidth,
    0.58
  );
  drawFieldLine(ctx, M + infoLeftW + 24, y, infoRightW, "Job No.", job.jobNo, 100);
  y += 42;

  drawPairRow(ctx, M, y, infoLeftW,
    "Boat Ramp", job.boatRamp,
    "Slip Location", job.slipLocation,
    0.58
  );
  drawFieldLine(ctx, M + infoLeftW + 24, y, infoRightW, "Day", job.jobDay, 100);
  y += 42;

  drawSectionTitle(ctx, M, y + 24, "Items Used");
  drawFieldLine(ctx, M + infoLeftW + 24, y, infoRightW, "Techs", job.techs, 100);
  y += 34;

  drawTextBox(ctx, M, y, infoLeftW, 92, job.itemsUsed || "", 17);
  drawFieldLine(ctx, M + infoLeftW + 24, y + 1, infoRightW, "Call?", job.callRequired, 100);
  drawFieldLine(ctx, M + infoLeftW + 24, y + 34, infoRightW, "Arrive", job.arrive, 100);
  drawFieldLine(ctx, M + infoLeftW + 24, y + 67, infoRightW, "Left", job.left, 100);
  y += 110;

  // Equipment table
  drawRule(ctx, M, y, W, 3);
  y += 12;
  drawSectionTitle(ctx, M, y + 22, "Lift / Equipment");
  y += 32;
  const equipment = (job.equipment || [])[0] || {};
  const eqHeaders = ["Installed","Lift Type","Color","Boat","Tank Numbers","Motor","Motor Number","Inst."];
  const eqVals = [
    equipment.installed, equipment.liftType, equipment.color, equipment.boat,
    equipment.tankNumbers, equipment.motor, equipment.motorNumber, equipment.inst
  ];
  const eqWidths = [100,130,75,185,180,95,160,90];
  drawSingleRowTable(ctx, M, y, eqHeaders, eqVals, eqWidths, 72);
  y += 86;

  // Service history
  drawRule(ctx, M, y, W, 3);
  y += 12;
  drawSectionTitle(ctx, M, y + 22, "Previous Service Calls");
  y += 34;
  const histHeaders = ["Call In Date","Lift","Techs","Description"];
  const histWidths = [135,110,165,W - 410];
  const hist = (job.history || []).slice(0, 8);
  drawHistoryTable(ctx, M, y, histHeaders, hist, histWidths);
  const histHeight = 38 + Math.max(1, hist.length) * 42;
  y += histHeight + 14;

  // Notes
  drawRule(ctx, M, y, W, 3);
  y += 12;
  drawSectionTitle(ctx, M, y + 22, "Work Performed / Notes");
  y += 34;
  const remaining = canvas.height - y - 55;
  drawTextBox(ctx, M, y, W, Math.max(140, remaining), job.workNotes || "", 18);

  // Footer
  ctx.fillStyle = "#67747b";
  ctx.font = "13px Arial";
  ctx.textAlign = "right";
  ctx.fillText(buildPdfFilename(job), canvas.width - M, canvas.height - 20);
  ctx.textAlign = "left";

  return canvas;
}

async function renderPhotoPage(job, photoSources, pageNumber, totalPages) {
  const canvas = document.createElement("canvas");
  canvas.width = 1275;
  canvas.height = 1650;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const M = 50;
  const logo = await loadImage("./logo-flag.png");
  ctx.drawImage(logo, M, 36, 95, 80);
  ctx.fillStyle = PDF_NAVY;
  ctx.font = "bold 34px Arial";
  ctx.fillText(`Job #${safe(job.jobNo)} • Job Photos`, 165, 78);
  ctx.font = "17px Arial";
  ctx.fillStyle = "#465861";
  ctx.fillText(`${safe(job.customerName)} • ${safe(job.crew)}`, 165, 105);
  drawRule(ctx, M, 132, canvas.width - M * 2, 4);

  const cellGap = 24;
  const cellW = (canvas.width - M * 2 - cellGap) / 2;
  const cellH = 650;
  const positions = [
    [M, 170], [M + cellW + cellGap, 170],
    [M, 170 + cellH + cellGap], [M + cellW + cellGap, 170 + cellH + cellGap]
  ];

  for (let i = 0; i < photoSources.length; i++) {
    const [x, y] = positions[i];
    ctx.strokeStyle = "#b8c6cd";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cellW, cellH);
    const img = await loadImage(photoSources[i]);
    drawImageContain(ctx, img, x + 10, y + 10, cellW - 20, cellH - 45);
    ctx.fillStyle = "#56666e";
    ctx.font = "14px Arial";
    ctx.fillText(`Photo ${(pageNumber - 1) * 4 + i + 1}`, x + 12, y + cellH - 14);
  }

  ctx.fillStyle = "#67747b";
  ctx.font = "13px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`Photos ${pageNumber} of ${totalPages}`, canvas.width - M, canvas.height - 22);
  ctx.textAlign = "left";
  return canvas;
}

function drawRule(ctx, x, y, w, thickness=2) {
  ctx.fillStyle = PDF_BLUE;
  ctx.fillRect(x, y, w, thickness);
}

function drawSectionTitle(ctx, x, baselineY, text) {
  ctx.fillStyle = PDF_BLUE;
  ctx.font = "bold 25px Arial";
  ctx.fillText(text, x, baselineY);
}

function drawFieldLine(ctx, x, y, w, label, value, labelW=100) {
  ctx.fillStyle = "#111820";
  ctx.font = "bold 15px Arial";
  ctx.fillText(label, x, y + 22);
  ctx.font = "16px Arial";
  ctx.fillText(safe(value), x + labelW, y + 22);
  ctx.strokeStyle = "#9eb0b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + labelW - 2, y + 29);
  ctx.lineTo(x + w, y + 29);
  ctx.stroke();
}

function drawPairRow(ctx, x, y, w, label1, value1, label2, value2, firstRatio=0.6) {
  const gap = 24;
  const firstW = Math.floor((w - gap) * firstRatio);
  const secondW = w - gap - firstW;
  drawFieldLine(ctx, x, y, firstW, label1, value1, 90);
  drawFieldLine(ctx, x + firstW + gap, y, secondW, label2, value2, 105);
}

function drawTextBox(ctx, x, y, w, h, text, fontSize=17) {
  ctx.strokeStyle = "#aebfc7";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#151b20";
  ctx.font = `${fontSize}px Arial`;
  wrapCanvasText(ctx, safe(text), x + 10, y + 24, w - 20, fontSize + 6, Math.floor((h - 18) / (fontSize + 6)));
}

function drawSingleRowTable(ctx, x, y, headers, values, widths, rowH) {
  let cx = x;
  const headerH = 30;
  headers.forEach((h, i) => {
    ctx.fillStyle = PDF_LIGHT;
    ctx.fillRect(cx, y, widths[i], headerH);
    ctx.strokeStyle = PDF_GRID;
    ctx.strokeRect(cx, y, widths[i], headerH + rowH);
    ctx.fillStyle = "#173e4e";
    ctx.font = "bold 12px Arial";
    wrapCanvasText(ctx, h, cx + 5, y + 18, widths[i] - 10, 14, 2);
    ctx.fillStyle = "#111820";
    ctx.font = "14px Arial";
    wrapCanvasText(ctx, safe(values[i]), cx + 5, y + headerH + 20, widths[i] - 10, 17, 3);
    cx += widths[i];
  });
}

function drawHistoryTable(ctx, x, y, headers, rows, widths) {
  const headerH = 30;
  let cx = x;
  headers.forEach((h, i) => {
    ctx.fillStyle = PDF_LIGHT;
    ctx.fillRect(cx, y, widths[i], headerH);
    ctx.strokeStyle = PDF_GRID;
    ctx.strokeRect(cx, y, widths[i], headerH);
    ctx.fillStyle = "#173e4e";
    ctx.font = "bold 12px Arial";
    ctx.fillText(h, cx + 5, y + 19);
    cx += widths[i];
  });

  const effectiveRows = rows.length ? rows : [{date:"",lift:"",techs:"",description:""}];
  effectiveRows.forEach((r, rowIndex) => {
    let rx = x;
    const ry = y + headerH + rowIndex * 42;
    const vals = [r.date, r.lift, r.techs, r.description];
    vals.forEach((v, i) => {
      ctx.strokeStyle = "#c1cdd2";
      ctx.strokeRect(rx, ry, widths[i], 42);
      ctx.fillStyle = "#111820";
      ctx.font = i === 3 ? "12px Arial" : "13px Arial";
      wrapCanvasText(ctx, safe(v), rx + 5, ry + 17, widths[i] - 10, 14, 2);
      rx += widths[i];
    });
  });
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines=99) {
  const words = String(text || "").split(/\s+/);
  let line = "";
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const test = line ? `${line} ${words[n]}` : words[n];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      lineCount++;
      if (lineCount >= maxLines) return;
      line = words[n];
    } else {
      line = test;
    }
  }
  if (line && lineCount < maxLines) ctx.fillText(line, x, y + lineCount * lineHeight);
}

function drawImageContain(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function safe(value) {
  return String(value ?? "");
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function asciiBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function concatBytes(parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach(p => {
    out.set(p, offset);
    offset += p.length;
  });
  return out;
}

function buildPdfFromJpegs(pages) {
  const parts = [];
  const offsets = [0];
  let length = 0;
  const push = bytes => {
    parts.push(bytes);
    length += bytes.length;
  };
  const pushText = text => push(asciiBytes(text));

  // PDF binary header.
  push(new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34,0x0a,0x25,0xff,0xff,0xff,0xff,0x0a]));

  const pageObjectIds = pages.map((_, i) => 3 + i * 3);
  const imageObjectIds = pages.map((_, i) => 4 + i * 3);
  const contentObjectIds = pages.map((_, i) => 5 + i * 3);
  const objectCount = 2 + pages.length * 3;

  const beginObj = id => {
    offsets[id] = length;
    pushText(`${id} 0 obj\n`);
  };
  const endObj = () => pushText("endobj\n");

  beginObj(1);
  pushText("<< /Type /Catalog /Pages 2 0 R >>\n");
  endObj();

  beginObj(2);
  pushText(`<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(" ")}] >>\n`);
  endObj();

  pages.forEach((page, i) => {
    const pageId = pageObjectIds[i];
    const imageId = imageObjectIds[i];
    const contentId = contentObjectIds[i];

    beginObj(pageId);
    pushText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\n`);
    endObj();

    beginObj(imageId);
    pushText(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`);
    push(page.bytes);
    pushText("\nendstream\n");
    endObj();

    const content = asciiBytes("q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ\n");
    beginObj(contentId);
    pushText(`<< /Length ${content.length} >>\nstream\n`);
    push(content);
    pushText("endstream\n");
    endObj();
  });

  const xrefOffset = length;
  pushText(`xref\n0 ${objectCount + 1}\n`);
  pushText("0000000000 65535 f \n");
  for (let id = 1; id <= objectCount; id++) {
    pushText(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob([concatBytes(parts)], { type: "application/pdf" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function buildPdfFilename(job) {
  const cleanName = value => String(value ?? "Customer")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");

  const customerName = cleanName(job.customerName || "Customer");
  const date = getFilenameDate(job.jobDay);

  return `${customerName} ${date}.pdf`;
}

function getFilenameDate(jobDay) {
  const raw = String(jobDay ?? "").trim();

  // Prefer an M/D/Y date if the office-imported job date already contains one.
  const mdY = raw.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (mdY) {
    let year = Number(mdY[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return `${Number(mdY[1])}-${Number(mdY[2])}-${year}`;
  }

  // Otherwise try normal JavaScript date parsing, then fall back to today.
  const parsed = new Date(raw);
  const d = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
}

function resizeImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => img.src = reader.result;
    reader.onerror = reject;
    img.onerror = reject;
    img.onload = () => {
      let {width, height} = img;
      const scale = Math.min(1, maxSize / Math.max(width,height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img,0,0,width,height);
      resolve(canvas.toDataURL("image/jpeg",quality));
    };
    reader.readAsDataURL(file);
  });
}
function pulseSaved() {
  syncPill.textContent = "✓ Saved locally";
  clearTimeout(pulseSaved.t);
  pulseSaved.t = setTimeout(() => syncPill.textContent = "● Local", 1800);
}
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
}

if (currentCrew && CREWS.includes(currentCrew)) showJobs();
else showCrewGate();
