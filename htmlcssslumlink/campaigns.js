(() => {
  const STORAGE_KEY = "slumlink_campaigns";

  const listEl = document.getElementById("campaignsList");
  const summaryEl = document.getElementById("summary");
  const filters = Array.from(document.querySelectorAll(".filter"));

  const homeLink = document.getElementById("homeLink");
  const newCampaign = document.getElementById("newCampaign");

  let activeFilter = "all";

  function safeJsonParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function loadCampaigns() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? safeJsonParse(raw, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function saveCampaigns(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function statusOf(c) {
    const s = String(c.status || "pending").toLowerCase();
    return s === "finished" ? "finished" : "pending";
  }

  function byDateTimeDesc(a, b) {
    const ad = `${a.date || ""}T${a.time || "00:00"}`;
    const bd = `${b.date || ""}T${b.time || "00:00"}`;
    return bd.localeCompare(ad);
  }

  function filtered(items) {
    if (activeFilter === "pending") return items.filter((c) => statusOf(c) === "pending");
    if (activeFilter === "finished") return items.filter((c) => statusOf(c) === "finished");
    return items;
  }

  function render() {
    if (!listEl) return;

    const items = loadCampaigns().slice().sort(byDateTimeDesc);
    const shown = filtered(items);

    if (summaryEl) {
      const pending = items.filter((c) => statusOf(c) === "pending").length;
      const finished = items.filter((c) => statusOf(c) === "finished").length;
      summaryEl.textContent = `${items.length} total • ${pending} pending • ${finished} finished`;
    }

    if (shown.length === 0) {
      listEl.innerHTML = "<div class=\"summary\">No campaigns found for this filter.</div>";
      return;
    }

    listEl.innerHTML = shown
      .map((c) => {
        const dt = `${c.date || ""}${c.time ? ` • ${c.time}` : ""}`.trim();
        const status = statusOf(c);
        const helped = status === "finished" && Number.isFinite(Number(c.peopleHelped)) ? Number(c.peopleHelped) : null;

        return `
          <div class="campaign-card" data-id="${escapeHtml(c.id)}" role="button" tabindex="0">
            <div class="campaign-top">
              <div>
                <h3 class="campaign-title">${escapeHtml(c.title)}</h3>
                <div class="campaign-sub">${escapeHtml(c.slumArea)}${dt ? ` • ${escapeHtml(dt)}` : ""}</div>
              </div>
              <span class="pill ${status}">${escapeHtml(status)}</span>
            </div>

            <div class="campaign-meta">
              <div>Category: <strong>${escapeHtml(c.category || "-")}</strong></div>
              <div>Target: <strong>${escapeHtml(c.gender || "-")}</strong></div>
              ${helped !== null ? `<div style=\"grid-column: 1 / -1;\">People helped: <strong>${helped}</strong></div>` : ""}
            </div>

            <div class="card-actions">
              <button class="btn-tertiary" type="button" data-action="delete">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function setActiveFilter(next) {
    activeFilter = next;
    filters.forEach((b) => {
      const isActive = b.getAttribute("data-filter") === next;
      b.classList.toggle("is-active", isActive);
      b.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    render();
  }

  function openDetail(id) {
    window.location.href = `campaign-detail.html?id=${encodeURIComponent(id)}`;
  }

  filters.forEach((b) => {
    b.addEventListener("click", () => setActiveFilter(b.getAttribute("data-filter") || "all"));
  });

  listEl?.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const deleteBtn = target.closest("button[data-action=delete]");
    const card = target.closest(".campaign-card");
    const id = card?.getAttribute("data-id");

    if (!id) return;

    if (deleteBtn) {
      const items = loadCampaigns().filter((c) => c.id !== id);
      saveCampaigns(items);
      render();
      return;
    }

    openDetail(id);
  });

  listEl?.addEventListener("keydown", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (e.key !== "Enter") return;

    const card = target.closest(".campaign-card");
    const id = card?.getAttribute("data-id");
    if (!id) return;
    openDetail(id);
  });

  homeLink?.addEventListener("click", () => {
    window.location.href = "ngo-dashboard.html";
  });

  newCampaign?.addEventListener("click", () => {
    window.location.href = "create-entry.html";
  });

  render();
})();
