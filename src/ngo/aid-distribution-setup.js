const API_BASE = ""; // keep "" if same server
// Keep this key consistent with aid-distribution-session.js
const STORAGE_KEY = "slumlink_distribution_session_draft";

const campaignSelect = document.getElementById("campaignSelect");
const typeSelect = document.getElementById("typeSelect");
const startBtn = document.getElementById("startBtn");
const preview = document.getElementById("campaignPreview");
const backBtn = document.getElementById("backBtn");

document.getElementById("brandBtn")?.addEventListener("click", ()=> window.location.href = "/");

function getBackLink(){
  const params = new URLSearchParams(location.search);
  return params.get("back") || "./ngo-dashboard.html";
}

backBtn?.addEventListener("click", ()=> {
  window.location.href = getBackLink();
});

function safeJSON(res){ return res.json().catch(()=>null); }

async function fetchCampaigns(){
  try{
    const res = await fetch(`${API_BASE}/api/campaigns/mine`, { credentials:"include" });
    if(!res.ok) throw new Error("fail");
    const data = await safeJSON(res);
    const list = Array.isArray(data) ? data : (data?.campaigns ?? []);
    return list;
  }catch{
    // fallback demo
    return [
      { id:"demo1", title:"Winter Blanket Drive", targetSlumArea:"Mirpur", startDate:"2026-01-01", endDate:"2026-01-15" },
      { id:"demo2", title:"Food Pack Distribution", targetSlumArea:"Korail", startDate:"2026-02-01", endDate:"2026-02-07" }
    ];
  }
}

async function fetchAidTypes(){
  try{
    const res = await fetch(`${API_BASE}/api/aid-types`, { credentials:"include" });
    if(!res.ok) throw new Error("fail");
    const data = await safeJSON(res);
    const list = Array.isArray(data) ? data : (data?.types ?? []);
    // normalize fields if backend uses snake_case
    return list.map(t => ({
      id: t.id,
      name: t.name,
      requiresQuantity: t.requiresQuantity ?? t.requires_quantity ?? false,
      unitLabel: t.unitLabel ?? t.unit_label ?? ""
    }));
  }catch{
    return [
      { id:"food", name:"Food", requiresQuantity:true, unitLabel:"pack / kg" },
      { id:"cloth", name:"Clothing", requiresQuantity:true, unitLabel:"pcs" },
      { id:"skill", name:"Skill Training", requiresQuantity:false },
      { id:"job", name:"Job Placement", requiresQuantity:false }
    ];
  }
}

function fillSelect(select, list, labelKey){
  select.innerHTML = `<option value="" selected disabled>Select</option>`;
  list.forEach(item=>{
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item[labelKey] ?? item.name ?? item.id;
    opt.dataset.raw = JSON.stringify(item);
    select.appendChild(opt);
  });
}

function updateStartState(){
  startBtn.disabled = !(campaignSelect.value && typeSelect.value);
}

function renderPreview(camp){
  if(!camp){
    preview.querySelector(".preview-body")?.remove();
    preview.innerHTML = `
      <div class="preview-title">Campaign Preview</div>
      <div class="preview-body muted">Select a campaign to see basic details (title + target area).</div>
    `;
    return;
  }

  const title = camp.title ?? camp.name ?? "—";
  const area = camp.targetSlumArea ?? camp.target_slum_area ?? camp.area ?? "—";
  const start = camp.startDate ?? camp.start_date ?? "";
  const end = camp.endDate ?? camp.end_date ?? "";

  const dateText = (start || end) ? `${start || "—"} → ${end || "—"}` : "";

  preview.innerHTML = `
    <div class="preview-title">Campaign Preview</div>
    <div class="preview-body">
      <div><b>Title:</b> ${escapeHtml(title)}</div>
      <div style="margin-top:6px"><b>Target area:</b> ${escapeHtml(area)}</div>
      ${dateText ? `<div style="margin-top:6px"><b>Date:</b> ${escapeHtml(dateText)}</div>` : ""}
    </div>
  `;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

async function createSession(campaignId, aidTypeId){
  try{
    const res = await fetch(`${API_BASE}/api/distribution-sessions`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      credentials:"include",
      body: JSON.stringify({ campaignId, aidTypeId })
    });
    if(!res.ok) throw new Error("fail");
    const data = await safeJSON(res);
    return data?.sessionId ?? data?.id ?? null;
  }catch{
    // local-only fallback
    return `local_${Date.now()}`;
  }
}

let campaignsCache = [];
let typesCache = [];

campaignSelect.addEventListener("change", ()=>{
  updateStartState();
  const opt = campaignSelect.selectedOptions[0];
  const camp = opt ? JSON.parse(opt.dataset.raw) : null;
  renderPreview(camp);
});

typeSelect.addEventListener("change", updateStartState);

startBtn.addEventListener("click", async ()=>{
  const campOpt = campaignSelect.selectedOptions[0];
  const typeOpt = typeSelect.selectedOptions[0];
  if(!campOpt || !typeOpt) return;

  const campaign = JSON.parse(campOpt.dataset.raw);
  const aidType = JSON.parse(typeOpt.dataset.raw);

  const sessionId = await createSession(campaign.id, aidType.id);

  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    sessionId,
    campaign,
    aidType,
    startedAt: new Date().toISOString()
  }));

  const params = new URLSearchParams(location.search);
  const back = params.get("back") || "./ngo-dashboard.html";
  window.location.href = `./aid-distribution-session.html?back=${encodeURIComponent(back)}`;
});

(async function init(){
  campaignsCache = await fetchCampaigns();
  fillSelect(campaignSelect, campaignsCache, "title");

  typesCache = await fetchAidTypes();
  fillSelect(typeSelect, typesCache, "name");

  renderPreview(null);
  updateStartState();
})();
