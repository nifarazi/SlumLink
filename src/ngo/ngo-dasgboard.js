// Date pill
(function setDate() {
  const el = document.getElementById("currentDate");
  const now = new Date();
  const opt = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  el.textContent = now.toLocaleDateString("en-US", opt);
})();

// Mobile sidebar toggle
(function sidebar() {
  const btn = document.getElementById("sidebarToggle");
  const overlay = document.getElementById("overlay");

  function close() {
    document.body.classList.remove("sidebar-open");
  }
  function toggle() {
    document.body.classList.toggle("sidebar-open");
  }

  btn?.addEventListener("click", toggle);
  overlay?.addEventListener("click", close);

  // Close on ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // Active nav highlight
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
      item.classList.add("active");
      close();
    });
  });
})();

// Button hooks (replace with your real navigation later)
(function actions() {
  const toast = (msg) => {
    const old = document.querySelector(".toast");
    if (old) old.remove();

    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;

    Object.assign(t.style, {
      position: "fixed",
      right: "18px",
      bottom: "18px",
      background: "rgba(97,55,41,0.95)",
      color: "white",
      padding: "12px 14px",
      borderRadius: "14px",
      zIndex: 999,
      boxShadow: "0 18px 30px rgba(0,0,0,0.22)",
      fontFamily: "Poppins, sans-serif",
      fontWeight: "500",
      maxWidth: "320px"
    });

    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  };

  document.getElementById("generateReport")?.addEventListener("click", () => toast("Generating report..."));
  document.getElementById("createCampaign")?.addEventListener("click", () => toast("Opening campaign creation..."));
  document.getElementById("viewCampaigns")?.addEventListener("click", () => toast("Loading campaigns..."));
  document.getElementById("openAnalytics")?.addEventListener("click", () => toast("Opening analytics..."));
  document.getElementById("profileBtn")?.addEventListener("click", () => toast("Opening profile..."));
})();
