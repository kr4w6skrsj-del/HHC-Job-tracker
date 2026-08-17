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
document.getElementById("printBtn").addEventListener("click", () => {
  saveCurrentForm();
  window.print();
});
document.querySelectorAll(".time-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.timeTarget);
    input.value = new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
    saveCurrentForm("In Progress", true);
  });
});
document.getElementById("photoInput").addEventListener("change", async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  const job = getCurrentJob();
  for (const file of files) {
    const dataUrl = await resizeImage(file, 1200, .78);
    job.photos.push(dataUrl);
  }
  saveState();
  renderPhotos(job);
  e.target.value = "";
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
