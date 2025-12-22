(() => {
  const COMPLAINTS_KEY = "slumlink_complaints";

  const complaintIdInput = document.getElementById("complaintId");
  const resultEl = document.getElementById("complaintResult");
  const listEl = document.getElementById("complaintsList");

  const statTotal = document.getElementById("statTotal");
  const statPending = document.getElementById("statPending");
  const statReview = document.getElementById("statReview");
  const statResolved = document.getElementById("statResolved");

  const checkBtn = document.getElementById("checkComplaint");
  const markInReviewBtn = document.getElementById("markInReview");
  const markResolvedBtn = document.getElementById("markResolved");

  let selectedComplaintId = null;

  function safeJsonParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function loadComplaints() {
    const raw = localStorage.getItem(COMPLAINTS_KEY);
    const parsed = raw ? safeJsonParse(raw, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function saveComplaints(items) {
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(items));
  }

  function seedComplaintsIfMissing() {
    const existing = loadComplaints();
    if (existing.length > 0) return;

    const seed = [
      {
        id: "CMP-1024",
        title: "Water supply issue",
        category: "Water",
        slumArea: "Korail",
        status: "pending",
        description: "No water for 2 days near Block C.",
        submittedAt: "2025-12-15",
      },
      {
        id: "CMP-2041",
        title: "Street light broken",
        category: "Electricity",
        slumArea: "Mirpur",
        status: "in-review",
        description: "Main lane light is not working at night.",
        submittedAt: "2025-12-14",
      },
      {
        id: "CMP-3307",
        title: "Drainage blockage",
        category: "Sanitation",
        slumArea: "Dharavi",
        status: "resolved",
        description: "Water logging near school.",
        submittedAt: "2025-12-10",
      },
    ];

    saveComplaints(seed);
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function statusLabel(status) {
    switch (status) {
      case "pending":
        return "Pending";
      case "in-review":
        return "In Review";
      case "resolved":
        return "Resolved";
      default:
        return "Unknown";
    }
  }

  function renderStats(items) {
    const total = items.length;
    const pending = items.filter((c) => c.status === "pending").length;
    const review = items.filter((c) => c.status === "in-review").length;
    const resolved = items.filter((c) => c.status === "resolved").length;

    if (statTotal) statTotal.textContent = String(total);
    if (statPending) statPending.textContent = String(pending);
    if (statReview) statReview.textContent = String(review);
    if (statResolved) statResolved.textContent = String(resolved);
  }

  function renderList(items) {
    if (!listEl) return;

    const sorted = items.slice().sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));

    listEl.innerHTML = sorted
      .slice(0, 8)
      .map((c) => {
        return `
          <div class="history-item" data-complaint-id="${escapeHtml(c.id)}">
            <div class="history-content">
              <h4>${escapeHtml(c.id)} • ${escapeHtml(c.title)}</h4>
              <p>${escapeHtml(c.slumArea)} • ${escapeHtml(c.category)}</p>
              <span class="date">${escapeHtml(c.submittedAt)} • ${escapeHtml(statusLabel(c.status))}</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderResult(complaint) {
    if (!resultEl) return;

    if (!complaint) {
      resultEl.innerHTML = `<div class="complaint-empty">No complaint found. Check the ID and try again.</div>`;
      return;
    }

    const pillClass = complaint.status === "resolved" ? "is-resolved" : complaint.status === "in-review" ? "is-review" : "is-pending";

    resultEl.innerHTML = `
      <div class="complaint-box">
        <div class="complaint-top">
          <div>
            <div class="complaint-id">${escapeHtml(complaint.id)}</div>
            <div class="complaint-title">${escapeHtml(complaint.title)}</div>
          </div>
          <span class="status-pill ${pillClass}">${escapeHtml(statusLabel(complaint.status))}</span>
        </div>
        <div class="complaint-meta">
          <div>Area: <strong>${escapeHtml(complaint.slumArea)}</strong></div>
          <div>Category: <strong>${escapeHtml(complaint.category)}</strong></div>
          <div>Date: <strong>${escapeHtml(complaint.submittedAt)}</strong></div>
        </div>
        <div class="complaint-desc">${escapeHtml(complaint.description)}</div>
      </div>
    `;
  }

  function findComplaintById(items, id) {
    const needle = String(id || "").trim().toUpperCase();
    if (!needle) return null;
    return items.find((c) => String(c.id).toUpperCase() === needle) || null;
  }

  function check() {
    const items = loadComplaints();
    const complaint = findComplaintById(items, complaintIdInput?.value);
    selectedComplaintId = complaint?.id || null;
    renderResult(complaint);
  }

  function updateStatus(nextStatus) {
    if (!selectedComplaintId) {
      renderResult(null);
      return;
    }

    const items = loadComplaints();
    const idx = items.findIndex((c) => c.id === selectedComplaintId);
    if (idx < 0) {
      renderResult(null);
      return;
    }

    items[idx] = { ...items[idx], status: nextStatus };
    saveComplaints(items);

    renderStats(items);
    renderList(items);
    renderResult(items[idx]);
  }

  function onClick(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", handler);
  }

  seedComplaintsIfMissing();

  const initial = loadComplaints();
  renderStats(initial);
  renderList(initial);
  renderResult(null);

  onClick("checkComplaint", check);
  complaintIdInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      check();
    }
  });

  onClick("markInReview", () => updateStatus("in-review"));
  onClick("markResolved", () => updateStatus("resolved"));

  listEl?.addEventListener("click", (e) => {
    const el = e.target instanceof HTMLElement ? e.target.closest(".history-item") : null;
    const id = el?.getAttribute("data-complaint-id");
    if (!id) return;
    if (complaintIdInput) complaintIdInput.value = id;
    check();
  });

  onClick("createNoticeTop", () => {
    alert("Create notice (coming soon)");
  });

  onClick("profileBtn", () => {
    alert("Navigate to Authority Profile & Settings");
  });
})();
