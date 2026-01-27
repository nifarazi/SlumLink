/* =========================
   Aid Distribution (Session)
   - Reads draft session from localStorage (set by setup page)
   - Optional snapshot: family size + ages + history for THIS NGO only
   - Quantity shown only if aidType requires it
   - Optional comment
   - Confirm entry resets form for next family
   - Finish distribution returns to ngo-dashboard.html
========================= */

const API_BASE = ""; // "" if same origin
const STORAGE_KEY = "slumlink_distribution_session_draft";
const ENTRIES_KEY_PREFIX = "slumlink_distribution_entries_";

// DOM
const sessionMeta = document.getElementById("sessionMeta");
const aidTypePill = document.getElementById("aidTypePill");

const familyCodeEl = document.getElementById("familyCode");
const familyHintEl = document.getElementById("familyHint");

const qtyWrap = document.getElementById("qtyFieldWrap");
const qtyEl = document.getElementById("quantity");
const qtyHintEl = document.getElementById("qtyHint");

const toggleSnapshotBtn = document.getElementById("toggleSnapshotBtn");
const snapshotPanel = document.getElementById("snapshotPanel");
const familySummaryEl = document.getElementById("familySummary");
const orgHistoryEl = document.getElementById("orgHistory");

const commentEl = document.getElementById("comment");
const clearBtn = document.getElementById("clearBtn");
const confirmBtn = document.getElementById("confirmBtn");
const finishBtn = document.getElementById("finishBtn");

const statusBox = document.getElementById("statusBox");
const entriesBody = document.getElementById("entriesBody");
const entryCount = document.getElementById("entryCount");

// Finish confirmation modal
const finishModal = document.getElementById("finishModal");
const cancelFinish = document.getElementById("cancelFinish");
const confirmFinish = document.getElementById("confirmFinish");

function openFinishModal(){
  finishModal?.classList.add("show");
  finishModal?.setAttribute("aria-hidden", "false");
  cancelFinish?.focus();
}

function closeFinishModal(){
  finishModal?.classList.remove("show");
  finishModal?.setAttribute("aria-hidden", "true");
}

// Utils
function setStatus(msg, kind="") {
  statusBox.className = "status" + (kind ? ` ${kind}` : "");
  statusBox.textContent = msg || "";
}

function readDraft(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function entriesKey(sessionId){ return `${ENTRIES_KEY_PREFIX}${sessionId}`; }

function readEntries(sessionId){
  const raw = localStorage.getItem(entriesKey(sessionId));
  if (!raw) return [];
  try { return JSON.parse(raw) || []; } catch { return []; }
}

function writeEntries(sessionId, entries){
  localStorage.setItem(entriesKey(sessionId), JSON.stringify(entries));
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[s]));
}

function requiresQuantity(aidType){
  return !!(aidType?.requiresQuantity ?? aidType?.requires_quantity);
}

function normalizeUnit(aidType){
  return aidType?.unitLabel ?? aidType?.unit_label ?? "";
}

function renderEntries(entries){
  entryCount.textContent = `${entries.length} recorded`;
  entriesBody.innerHTML = "";

  if (!entries.length){
    const div = document.createElement("div");
    div.className = "empty muted";
    div.textContent = "No entries yet.";
    entriesBody.appendChild(div);
    return;
  }

  // newest on top
  for (const e of entries.slice().reverse()){
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <div>${new Date(e.createdAt).toLocaleString()}</div>
      <div><b>${escapeHtml(e.familyCode)}</b></div>
      <div>${e.quantity ?? "—"}</div>
      <div>${escapeHtml(e.comment || "—")}</div>
    `;
    entriesBody.appendChild(row);
  }
}

function resetSnapshotUI(){
  toggleSnapshotBtn.disabled = true;
  snapshotPanel.classList.add("hidden");
  familySummaryEl.innerHTML = `<span class="muted">No data yet.</span>`;
  orgHistoryEl.innerHTML = `<span class="muted">No data yet.</span>`;
}

function clearFamilySection(){
  familyCodeEl.value = "";
  qtyEl.value = "";
  commentEl.value = "";
  resetSnapshotUI();
  familyCodeEl.focus();
}

async function safeJson(res){
  return await res.json().catch(() => null);
}

/* ---------- Snapshot API ----------
   Expected backend:
   GET /api/families/by-code/:code/snapshot?sessionId=...
   Response (example):
   {
     family: { size: 6, ages: [4,9,16,28,33,62] },
     myOrgHistory: [
       { date:"2026-01-12", aidType:"Food", quantity:1, comment:"..." }
     ]
   }

   Backend must enforce org filter: only THIS NGO/local authority history.
----------------------------------- */
async function fetchSnapshot(code, sessionId){
  try{
    const url = new URL(`${API_BASE}/api/families/by-code/${encodeURIComponent(code)}/snapshot`, location.origin);
    url.searchParams.set("sessionId", sessionId);

    const res = await fetch(url.toString(), { credentials: "include" });
    if (!res.ok) throw new Error("snapshot failed");
    const data = await safeJson(res);
    if (!data) throw new Error("bad json");
    return data;
  } catch {
    // fallback demo (so UI still works while backend is not ready)
    return {
      family: { size: 6, ages: [4, 9, 16, 28, 33, 62] },
      myOrgHistory: [
        { date: "2026-01-12", aidType: "Food", quantity: 1, comment: "Monthly ration" },
        { date: "2025-12-20", aidType: "Clothing", quantity: 2, comment: "" }
      ]
    };
  }
}

function renderSnapshot(data){
  const size = data?.family?.size ?? data?.familySize ?? "—";
  const ages = data?.family?.ages ?? data?.memberAges ?? [];
  const agesText = Array.isArray(ages) && ages.length ? ages.join(", ") : "—";

  familySummaryEl.innerHTML = `
    <div><b>Family size:</b> ${escapeHtml(size)}</div>
    <div style="margin-top:6px"><b>Member ages:</b> ${escapeHtml(agesText)}</div>
  `;

  const history = data?.myOrgHistory ?? data?.history ?? [];
  if (!Array.isArray(history) || !history.length){
    orgHistoryEl.innerHTML = `<span class="muted">No previous records found for your organization.</span>`;
    return;
  }

  const items = history.slice(0, 10).map(h => {
    const date = h.date || h.distributedAt || h.created_at || "";
    const type = h.aidType || h.type || "";
    const qty = (h.quantity ?? h.qty ?? null);
    const cmt = h.comment || "";

    return `
      <div style="padding:8px 0; border-bottom:1px solid rgba(97,55,41,0.10)">
        <div><b>${escapeHtml(date)}</b> • ${escapeHtml(type)}
          ${qty != null ? ` • Qty: ${escapeHtml(qty)}` : ""}
        </div>
        <div class="muted" style="font-size:12px; margin-top:2px">${escapeHtml(cmt || "—")}</div>
      </div>
    `;
  }).join("");

  orgHistoryEl.innerHTML = items;
}

/* ---------- Entry API ----------
   Expected backend:
   POST /api/distribution-sessions/:sessionId/entries
   { familyCode, quantity?, comment? }
----------------------------------- */
async function postEntry(sessionId, payload){
  try{
    const res = await fetch(`${API_BASE}/api/distribution-sessions/${encodeURIComponent(sessionId)}/entries`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    if (!res.ok){
      const msg = await res.text().catch(()=> "");
      throw new Error(msg || "entry failed");
    }
    return await safeJson(res);
  } catch {
    // backend not ready -> local only
    return { ok:true, localOnly:true };
  }
}

/* ---------- Finish API ----------
   Expected backend:
   POST /api/distribution-sessions/:sessionId/finish
----------------------------------- */
async function finishSession(sessionId){
  try{
    await fetch(`${API_BASE}/api/distribution-sessions/${encodeURIComponent(sessionId)}/finish`, {
      method:"POST",
      credentials:"include"
    });
  } catch {
    // backend not ready -> ignore
  }
}

function getBackLink(){
  const params = new URLSearchParams(location.search);
  return params.get("back") || "./ngo-dashboard.html";
}

/* =========================
   INIT
========================= */
(function init(){
  const draft = readDraft();

  if (!draft?.sessionId || !draft?.campaign || !draft?.aidType){
    setStatus("No active distribution session found. Please start again from setup.", "bad");
    confirmBtn.disabled = true;
    toggleSnapshotBtn.disabled = true;

    // Keep finish button to return dashboard
    finishBtn.addEventListener("click", () => {
      location.href = getBackLink();
    });
    return;
  }

  // Header
  const campTitle = draft.campaign.title || draft.campaign.name || draft.campaign.id;
  sessionMeta.textContent = `Campaign: ${campTitle} • Started: ${new Date(draft.startedAt).toLocaleString()}`;
  aidTypePill.textContent = (draft.aidType.name || draft.aidType.id || "Aid Type").toString();

  // Quantity visibility
  if (requiresQuantity(draft.aidType)){
    qtyWrap.classList.remove("hidden");
    const unit = normalizeUnit(draft.aidType);
    qtyHintEl.textContent = unit ? `Unit: ${unit}` : "Enter quantity (required for this aid type).";
  } else {
    qtyWrap.classList.add("hidden");
  }

  // Load entries
  renderEntries(readEntries(draft.sessionId));

  // Enable snapshot button only when code seems valid length
  familyCodeEl.addEventListener("input", () => {
    const code = familyCodeEl.value.trim();
    toggleSnapshotBtn.disabled = code.length < 3;
    // If user changes code after opening snapshot, collapse snapshot for correctness
    if (!snapshotPanel.classList.contains("hidden")) {
      snapshotPanel.classList.add("hidden");
    }
  });

  // Snapshot toggle
  toggleSnapshotBtn.addEventListener("click", async () => {
    const code = familyCodeEl.value.trim();
    if (!code) return;

    // close if open
    if (!snapshotPanel.classList.contains("hidden")){
      snapshotPanel.classList.add("hidden");
      return;
    }

    setStatus("Loading family snapshot…");
    snapshotPanel.classList.remove("hidden");
    const snap = await fetchSnapshot(code, draft.sessionId);
    renderSnapshot(snap);
    setStatus("Snapshot loaded (optional).", "ok");
  });

  // Clear
  clearBtn.addEventListener("click", () => {
    setStatus("");
    clearFamilySection();
  });

  // Confirm entry
  confirmBtn.addEventListener("click", async () => {
    const code = familyCodeEl.value.trim();
    if (!code){
      setStatus("Family code is required.", "bad");
      return;
    }

    // quantity validation only if required
    const qtyNeeded = requiresQuantity(draft.aidType);
    const qtyVal = qtyNeeded ? Number(qtyEl.value) : null;

    if (qtyNeeded){
      if (!Number.isFinite(qtyVal) || qtyVal <= 0){
        setStatus("Quantity is required for this aid type and must be > 0.", "bad");
        return;
      }
    }

    const payload = {
      familyCode: code,
      quantity: qtyNeeded ? qtyVal : null,
      comment: commentEl.value.trim() || null
    };

    // local duplicate prevention (same session)
    const entries = readEntries(draft.sessionId);
    if (entries.some(e => e.familyCode === code)){
      setStatus("This family code is already recorded in this session.", "warn");
      return;
    }

    setStatus("Recording entry…");
    await postEntry(draft.sessionId, payload);

    entries.push({
      ...payload,
      createdAt: new Date().toISOString()
    });

    writeEntries(draft.sessionId, entries);
    renderEntries(entries);

    setStatus("Entry recorded. Ready for next family.", "ok");
    clearFamilySection();
  });

  // Finish session (confirm first)
  finishBtn.addEventListener("click", () => {
    openFinishModal();
  });

  cancelFinish?.addEventListener("click", () => closeFinishModal());
  finishModal?.addEventListener("click", (e) => { if (e.target === finishModal) closeFinishModal(); });

  confirmFinish?.addEventListener("click", async () => {
    closeFinishModal();
    setStatus("Finishing session…");

    await finishSession(draft.sessionId);

    // Clear draft (keep entries if you want to show them later)
    localStorage.removeItem(STORAGE_KEY);

    location.href = getBackLink();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && finishModal?.classList.contains("show")) closeFinishModal();
  });

  // Start focused
  clearFamilySection();
})();
