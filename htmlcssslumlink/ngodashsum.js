function $(id) {
  return document.getElementById(id);
}

function formatMonthYear(date) {
  const month = date.toLocaleString(undefined, { month: "long" });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

const AREA_DATA = {
  mirpur: {
    display: "Mirpur",
    campaigns: 3,
    categories: {
      Food: 420,
      Medical: 180,
      Education: 95,
      Shelter: 140,
    },
  },
  korail: {
    display: "Korail",
    campaigns: 2,
    categories: {
      Food: 260,
      Medical: 220,
      Education: 70,
      Shelter: 90,
    },
  },
  dharavi: {
    display: "Dharavi",
    campaigns: 4,
    categories: {
      Food: 520,
      Medical: 310,
      Education: 140,
      Shelter: 210,
    },
  },
  kibera: {
    display: "Kibera",
    campaigns: 3,
    categories: {
      Food: 380,
      Medical: 260,
      Education: 110,
      Shelter: 160,
    },
  },
};

function sumValues(obj) {
  return Object.values(obj).reduce((acc, v) => acc + v, 0);
}

function drawBarChart(canvas, labels, values) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Handle high-DPI screens
  const cssWidth = canvas.clientWidth || canvas.width;
  const cssHeight = canvas.clientHeight || canvas.height;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = cssWidth;
  const h = cssHeight;

  // Padding
  const pad = { left: 56, right: 18, top: 18, bottom: 46 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Background is handled by CSS; draw subtle grid + axes
  const maxVal = Math.max(...values, 1);
  const yMax = Math.ceil(maxVal / 50) * 50;

  ctx.font = "600 12px Inter, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(47, 34, 32, 0.72)";
  ctx.strokeStyle = "rgba(164, 98, 77, 0.18)";
  ctx.lineWidth = 1;

  // Grid lines + y labels
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = pad.top + plotH - t * plotH;
    const value = Math.round(t * yMax);

    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();

    ctx.fillText(String(value), 10, y + 4);
  }

  // Bars
  const barGap = 14;
  const barW = (plotW - barGap * (labels.length - 1)) / labels.length;

  labels.forEach((label, idx) => {
    const v = values[idx];
    const barH = (v / yMax) * plotH;
    const x = pad.left + idx * (barW + barGap);
    const y = pad.top + plotH - barH;

    // Bar fill
    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, "rgba(164, 98, 77, 0.95)");
    grad.addColorStop(1, "rgba(223, 164, 119, 0.85)");

    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barW, barH, 10);
    ctx.fill();

    // Value label
    ctx.fillStyle = "rgba(47, 34, 32, 0.85)";
    ctx.fillText(String(v), x + 6, y - 8);

    // X label
    ctx.fillStyle = "rgba(47, 34, 32, 0.72)";
    const textY = pad.top + plotH + 28;
    ctx.fillText(label, x, textY);
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function updateView(areaKey) {
  const area = AREA_DATA[areaKey] || AREA_DATA.mirpur;
  const monthText = formatMonthYear(new Date());

  $("monthLabel").textContent = monthText;
  $("campaignCount").textContent = String(area.campaigns);

  const total = sumValues(area.categories);
  $("peopleHelped").textContent = total.toLocaleString();

  const title = `Impact by category (this month) • ${area.display}`;
  $("chartTitle").textContent = title;

  const labels = Object.keys(area.categories);
  const values = Object.values(area.categories);
  drawBarChart($("impactChart"), labels, values);
}

function bind() {
  const select = $("slumAreaSelect");
  if (select) {
    select.addEventListener("change", (e) => {
      updateView(e.target.value);
    });
  }

  const back = $("backToDashboard");
  if (back) {
    back.addEventListener("click", () => {
      window.location.href = "ngo-dashboard.html";
    });
  }

  const brand = $("brandHome");
  if (brand) {
    brand.addEventListener("click", () => {
      window.location.href = "ngo-dashboard.html";
    });
  }

  const profile = $("profileBtn");
  if (profile) {
    profile.addEventListener("click", () => {
      alert("Navigate to NGO Profile & Settings");
    });
  }

  // Initial paint
  updateView(select ? select.value : "mirpur");

  // Repaint on resize to keep crisp layout
  window.addEventListener(
    "resize",
    () => {
      const selectValue = select ? select.value : "mirpur";
      updateView(selectValue);
    },
    { passive: true }
  );
}

bind();
