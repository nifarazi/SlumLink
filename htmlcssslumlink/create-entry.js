(() => {
  const STORAGE_KEY = "slumlink_campaigns";
  const PEOPLE_KEY = "slumlink_people";

  const form = document.getElementById("createForm");
  const notice = document.getElementById("notice");
  const itemsList = document.getElementById("itemsList");

  const categorySelect = document.getElementById("category");
  const extraFields = document.getElementById("extraFields");
  const requiredEducation = document.getElementById("requiredEducation");
  const requiredSkills = document.getElementById("requiredSkills");

  const previewMatchBtn = document.getElementById("previewMatch");
  const clearAllBtn = document.getElementById("clearAll");

  const homeLink = document.getElementById("homeLink");
  const backToDashboard = document.getElementById("backToDashboard");

  function setNotice(message, kind) {
    if (!notice) return;
    notice.textContent = message || "";
    notice.classList.remove("is-ok", "is-warn");
    if (kind === "ok") notice.classList.add("is-ok");
    if (kind === "warn") notice.classList.add("is-warn");
  }

  function parseCSV(text) {
    return (text || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function getSelectedSkills() {
    if (!requiredSkills) return [];
    const options = Array.from(requiredSkills.selectedOptions || []);
    return options.map((o) => normalizeSkill(o.value || o.textContent || "")).filter(Boolean);
  }

  function loadCampaigns() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCampaigns(campaigns) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  }

  function ensurePeopleSeeded() {
    try {
      const raw = localStorage.getItem(PEOPLE_KEY);
      if (raw) return;

      const seed = [
        {
          id: crypto.randomUUID?.() || String(Date.now() + 1),
          name: "Ayesha",
          gender: "female",
          age: 22,
          education: "secondary",
          skills: ["tailoring", "embroidery"],
          status: "unemployed",
        },
        {
          id: crypto.randomUUID?.() || String(Date.now() + 2),
          name: "Rahim",
          gender: "male",
          age: 28,
          education: "higher-secondary",
          skills: ["plumbing", "electric"],
          status: "unemployed",
        },
        {
          id: crypto.randomUUID?.() || String(Date.now() + 3),
          name: "Sumi",
          gender: "female",
          age: 17,
          education: "secondary",
          skills: ["computer basics", "digital literacy"],
          status: "student",
        },
        {
          id: crypto.randomUUID?.() || String(Date.now() + 4),
          name: "Kamal",
          gender: "male",
          age: 35,
          education: "primary",
          skills: ["driving", "delivery"],
          status: "unemployed",
        },
      ];

      localStorage.setItem(PEOPLE_KEY, JSON.stringify(seed));
    } catch {
      // ignore
    }
  }

  function loadPeople() {
    try {
      const raw = localStorage.getItem(PEOPLE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function educationRank(level) {
    switch (level) {
      case "none":
        return 0;
      case "primary":
        return 1;
      case "secondary":
        return 2;
      case "higher-secondary":
        return 3;
      case "graduate":
        return 4;
      default:
        return 0;
    }
  }

  function normalizeSkill(s) {
    return String(s || "").trim().toLowerCase();
  }

  function isCategoryWithExtras(category) {
    const c = String(category || "").toLowerCase();
    return c === "workshop" || c === "employment";
  }

  function updateExtraFieldsVisibility() {
    const category = categorySelect?.value || "";
    const shouldShow = isCategoryWithExtras(category);

    if (!extraFields) return;
    extraFields.hidden = !shouldShow;

    if (!shouldShow) {
      if (requiredEducation) requiredEducation.value = "";
      if (requiredSkills) {
        Array.from(requiredSkills.options || []).forEach((opt) => {
          opt.selected = false;
        });
      }
    }
  }

  function validateExtrasIfNeeded() {
    const category = categorySelect?.value || "";
    if (!isCategoryWithExtras(category)) return true;

    const edu = requiredEducation?.value || "";
    const selectedSkills = getSelectedSkills();

    if (!edu) {
      setNotice("Select required education for Workshop/Employment.", "warn");
      requiredEducation?.focus();
      return false;
    }

    if (selectedSkills.length === 0) {
      setNotice("Add at least one required skill for Workshop/Employment.", "warn");
      requiredSkills?.focus();
      return false;
    }

    return true;
  }

  function matchesTargeting(campaign, person) {
    // Gender
    if (campaign.gender && campaign.gender !== "both" && person.gender !== campaign.gender) {
      return false;
    }

    // Age group + range (we keep it simple: range is text, so check ageGroup only)
    if (campaign.ageGroup && campaign.ageGroup !== "both") {
      const isAdult = person.age >= 18;
      if (campaign.ageGroup === "adult" && !isAdult) return false;
      if (campaign.ageGroup === "child" && isAdult) return false;
    }

    return true;
  }

  function matchPeopleForCampaign(campaign) {
    ensurePeopleSeeded();

    const people = loadPeople();
    const category = String(campaign.category || "").toLowerCase();

    const requiredSkillsList = (campaign.requiredSkills || []).map(normalizeSkill);
    const requiredEdu = campaign.requiredEducation || "";

    return people
      .filter((p) => matchesTargeting(campaign, p))
      .filter((p) => {
        // Only for Employment: prioritize unemployed
        if (category === "employment" && p.status !== "unemployed") return false;

        // If extras are set, use them
        if (isCategoryWithExtras(campaign.category)) {
          const pEduRank = educationRank(p.education);
          const requiredRank = educationRank(requiredEdu);
          if (requiredEdu && pEduRank < requiredRank) return false;

          if (requiredSkillsList.length > 0) {
            const pSkills = (p.skills || []).map(normalizeSkill);
            const overlap = requiredSkillsList.some((s) => pSkills.includes(s));
            if (!overlap) return false;
          }
        }

        return true;
      });
  }

  function render() {
    if (!itemsList) return;

    const campaigns = loadCampaigns();
    if (campaigns.length === 0) {
      itemsList.innerHTML = "<div class=\"hint\">No items yet. Create your first campaign above.</div>";
      return;
    }

    itemsList.innerHTML = campaigns
      .slice()
      .reverse()
      .map((c) => {
        const dt = `${c.date || ""}${c.time ? ` • ${c.time}` : ""}`.trim();
        const skills = (c.requiredSkills || []).slice(0, 3).join(", ");
        const extrasText = isCategoryWithExtras(c.category)
          ? `${c.requiredEducation || ""}${skills ? ` • ${skills}` : ""}`
          : "";

        return `
          <div class="item" data-id="${c.id}">
            <div class="item-top">
              <div>
                <h3>${escapeHtml(c.title)}</h3>
                <div class="hint">${escapeHtml(c.slumArea)}${dt ? ` • ${escapeHtml(dt)}` : ""}</div>
              </div>
              <span class="pill">${escapeHtml(c.category || "Campaign")}</span>
            </div>
            <div class="item-meta">
              <div>Gender: ${escapeHtml(c.gender || "-")}</div>
              <div>Age: ${escapeHtml(c.ageGroup || "-")}</div>
              ${extrasText ? `<div style=\"grid-column: 1 / -1;\">Req: ${escapeHtml(extrasText)}</div>` : ""}
            </div>
            <div class="item-actions">
              <button class="btn-secondary" type="button" data-action="notify">Notify</button>
              <button class="btn-tertiary" type="button" data-action="delete">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildCampaignFromForm() {
    const fd = new FormData(form);

    const category = String(fd.get("category") || "");

    const campaign = {
      id: crypto.randomUUID?.() || String(Date.now()),
      entryType: "campaign",
      title: String(fd.get("title") || "").trim(),
      category,
      slumArea: String(fd.get("slumArea") || "").trim(),
      date: String(fd.get("date") || ""),
      time: String(fd.get("time") || ""),
      gender: String(fd.get("gender") || ""),
      ageGroup: String(fd.get("ageGroup") || ""),
      ageRange: String(fd.get("ageRange") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      status: "pending",
      peopleHelped: undefined,
      requiredEducation: isCategoryWithExtras(category) ? String(fd.get("requiredEducation") || "") : "",
      requiredSkills: isCategoryWithExtras(category) ? getSelectedSkills() : [],
      createdAt: new Date().toISOString(),
    };

    return campaign;
  }

  function initEvents() {
    if (categorySelect) {
      categorySelect.addEventListener("change", () => {
        updateExtraFieldsVisibility();
        setNotice("", "");
      });
    }

    homeLink?.addEventListener("click", () => {
      window.location.href = "ngo-dashboard.html";
    });

    backToDashboard?.addEventListener("click", () => {
      window.location.href = "ngo-dashboard.html";
    });

    previewMatchBtn?.addEventListener("click", () => {
      if (!form) return;
      if (!validateExtrasIfNeeded()) return;

      const campaign = buildCampaignFromForm();
      const matched = matchPeopleForCampaign(campaign);

      if (matched.length === 0) {
        setNotice("No matching people found for this targeting (demo list).", "warn");
        return;
      }

      const names = matched.slice(0, 5).map((p) => p.name).join(", ");
      setNotice(`Would notify ${matched.length} people: ${names}${matched.length > 5 ? "…" : ""}`, "ok");
    });

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      setNotice("", "");

      if (!validateExtrasIfNeeded()) return;

      const campaign = buildCampaignFromForm();
      const campaigns = loadCampaigns();
      campaigns.push(campaign);
      saveCampaigns(campaigns);

      form.reset();
      updateExtraFieldsVisibility();
      setNotice("Saved. You can manage it below.", "ok");
      render();
    });

    clearAllBtn?.addEventListener("click", () => {
      saveCampaigns([]);
      setNotice("Cleared all saved items.", "ok");
      render();
    });

    itemsList?.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const btn = target.closest("button");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      const item = btn.closest(".item");
      const id = item?.getAttribute("data-id");
      if (!action || !id) return;

      if (action === "delete") {
        const campaigns = loadCampaigns().filter((c) => c.id !== id);
        saveCampaigns(campaigns);
        setNotice("Deleted.", "ok");
        render();
        return;
      }

      if (action === "notify") {
        const campaign = loadCampaigns().find((c) => c.id === id);
        if (!campaign) return;

        const matched = matchPeopleForCampaign(campaign);
        if (matched.length === 0) {
          setNotice("No matching people found to notify (demo list).", "warn");
          return;
        }

        const names = matched.slice(0, 6).map((p) => p.name).join(", ");
        setNotice(`Notification sent to ${matched.length} people: ${names}${matched.length > 6 ? "…" : ""}`, "ok");
      }
    });
  }

  updateExtraFieldsVisibility();
  render();
  initEvents();
})();
