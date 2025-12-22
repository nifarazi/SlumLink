(() => {
  const STORAGE_KEY = "slumlink_campaigns";

  const backLink = document.getElementById("backLink");
  const backToList = document.getElementById("backToList");

  const detailTitle = document.getElementById("detailTitle");
  const detailSub = document.getElementById("detailSub");
  const notice = document.getElementById("notice");

  const form = document.getElementById("detailForm");

  const editBtn = document.getElementById("editBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const saveRow = document.getElementById("saveRow");
  const cancelBtn = document.getElementById("cancelBtn");

  const statusEl = document.getElementById("status");
  const peopleHelpedWrap = document.getElementById("peopleHelpedWrap");
  const peopleHelpedEl = document.getElementById("peopleHelped");

  const requiredEducationWrap = document.getElementById("requiredEducationWrap");
  const requiredSkillsWrap = document.getElementById("requiredSkillsWrap");
  const categoryEl = document.getElementById("category");
  const requiredEducationEl = document.getElementById("requiredEducation");
  const requiredSkillsEl = document.getElementById("requiredSkills");

  let current = null;
  let isEditing = false;

  function setNotice(message, kind) {
    if (!notice) return;
    notice.textContent = message || "";
    notice.classList.remove("is-ok", "is-warn");
    if (kind === "ok") notice.classList.add("is-ok");
    if (kind === "warn") notice.classList.add("is-warn");
  }

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

  function getId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  function isExtrasCategory(category) {
    const c = String(category || "").toLowerCase();
    return c === "workshop" || c === "employment";
  }

  function setDisabled(disabled) {
    Array.from(form?.querySelectorAll("input,select,textarea") || []).forEach((el) => {
      el.disabled = disabled;
    });
  }

  function selectedSkills() {
    if (!requiredSkillsEl) return [];
    return Array.from(requiredSkillsEl.selectedOptions || [])
      .map((o) => String(o.value || o.textContent || "").trim().toLowerCase())
      .filter(Boolean);
  }

  function applyModelToForm(model) {
    if (!form || !model) return;

    form.title.value = model.title || "";
    form.category.value = model.category || "Education";
    form.slumArea.value = model.slumArea || "";
    form.date.value = model.date || "";
    form.time.value = model.time || "";
    form.gender.value = model.gender || "both";
    form.ageGroup.value = model.ageGroup || "both";
    form.ageRange.value = model.ageRange || "";
    form.description.value = model.description || "";
    form.status.value = String(model.status || "pending");

    const shouldShowExtras = isExtrasCategory(model.category);
    if (requiredEducationWrap) requiredEducationWrap.hidden = !shouldShowExtras;
    if (requiredSkillsWrap) requiredSkillsWrap.hidden = !shouldShowExtras;

    if (requiredEducationEl) requiredEducationEl.value = model.requiredEducation || "";

    if (requiredSkillsEl) {
      const wanted = (model.requiredSkills || []).map((s) => String(s).toLowerCase());
      Array.from(requiredSkillsEl.options).forEach((opt) => {
        opt.selected = wanted.includes(String(opt.value).toLowerCase());
      });
    }

    const isFinished = String(model.status || "pending") === "finished";
    if (peopleHelpedWrap) peopleHelpedWrap.hidden = !isFinished;
    if (peopleHelpedEl) peopleHelpedEl.value = isFinished ? String(model.peopleHelped ?? "") : "";

    if (detailTitle) detailTitle.textContent = model.title || "Campaign";
    if (detailSub) {
      const dt = `${model.date || ""}${model.time ? ` • ${model.time}` : ""}`.trim();
      detailSub.textContent = `${model.slumArea || ""}${dt ? ` • ${dt}` : ""}`.trim();
    }
  }

  function setEditing(next) {
    isEditing = next;
    setDisabled(!next);
    if (saveRow) saveRow.hidden = !next;
    if (editBtn) editBtn.textContent = next ? "Editing…" : "Edit";
  }

  function validate() {
    if (!form) return false;

    if (!form.title.value.trim()) return false;
    if (!form.slumArea.value.trim()) return false;
    if (!form.date.value) return false;
    if (!form.time.value) return false;

    const category = form.category.value;
    if (isExtrasCategory(category)) {
      if (!form.requiredEducation.value) {
        setNotice("Select required education.", "warn");
        return false;
      }
      if (selectedSkills().length === 0) {
        setNotice("Select at least one required skill.", "warn");
        return false;
      }
    }

    const status = form.status.value;
    if (status === "finished") {
      const v = Number(form.peopleHelped.value);
      if (!Number.isFinite(v) || v < 0) {
        setNotice("People helped must be a non-negative number.", "warn");
        return false;
      }
    }

    return true;
  }

  function buildUpdated() {
    const category = form.category.value;
    const status = form.status.value;

    return {
      ...current,
      title: form.title.value.trim(),
      category,
      slumArea: form.slumArea.value.trim(),
      date: form.date.value,
      time: form.time.value,
      gender: form.gender.value,
      ageGroup: form.ageGroup.value,
      ageRange: form.ageRange.value.trim(),
      description: form.description.value.trim(),
      status,
      peopleHelped: status === "finished" ? Number(form.peopleHelped.value) : undefined,
      requiredEducation: isExtrasCategory(category) ? form.requiredEducation.value : "",
      requiredSkills: isExtrasCategory(category) ? selectedSkills() : [],
      updatedAt: new Date().toISOString(),
    };
  }

  function refreshConditionalUI() {
    const category = categoryEl?.value;
    const status = statusEl?.value;

    const showExtras = isExtrasCategory(category);
    if (requiredEducationWrap) requiredEducationWrap.hidden = !showExtras;
    if (requiredSkillsWrap) requiredSkillsWrap.hidden = !showExtras;

    const showHelped = status === "finished";
    if (peopleHelpedWrap) peopleHelpedWrap.hidden = !showHelped;
  }

  function init() {
    const id = getId();
    if (!id) {
      setNotice("Missing campaign id.", "warn");
      return;
    }

    const items = loadCampaigns();
    const found = items.find((c) => c.id === id);
    if (!found) {
      setNotice("Campaign not found.", "warn");
      return;
    }

    current = found;
    applyModelToForm(found);
    setEditing(false);

    backLink?.addEventListener("click", () => {
      window.location.href = "campaigns.html";
    });

    backToList?.addEventListener("click", () => {
      window.location.href = "campaigns.html";
    });

    editBtn?.addEventListener("click", () => {
      setNotice("", "");
      setEditing(true);
    });

    cancelBtn?.addEventListener("click", () => {
      setNotice("", "");
      applyModelToForm(current);
      setEditing(false);
    });

    deleteBtn?.addEventListener("click", () => {
      const next = loadCampaigns().filter((c) => c.id !== current.id);
      saveCampaigns(next);
      window.location.href = "campaigns.html";
    });

    categoryEl?.addEventListener("change", refreshConditionalUI);
    statusEl?.addEventListener("change", refreshConditionalUI);

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      setNotice("", "");

      if (!validate()) {
        if (!notice.textContent) setNotice("Please fill all required fields.", "warn");
        return;
      }

      const updated = buildUpdated();
      const items = loadCampaigns();
      const idx = items.findIndex((c) => c.id === current.id);
      if (idx >= 0) {
        items[idx] = updated;
        saveCampaigns(items);
      }

      current = updated;
      applyModelToForm(updated);
      setEditing(false);
      setNotice("Saved changes.", "ok");
    });
  }

  init();
})();
