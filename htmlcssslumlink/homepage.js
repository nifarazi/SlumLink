// Small enhancements for the landing page
(() => {
	const yearEl = document.getElementById("year");
	if (yearEl) yearEl.textContent = String(new Date().getFullYear());

	// Smooth-scroll for in-page links (keeps normal behavior for external pages)
	document.addEventListener("click", (e) => {
		const target = e.target;
		if (!(target instanceof Element)) return;

		const link = target.closest("a[href^='#']");
		if (!link) return;
		const href = link.getAttribute("href");
		if (!href || href === "#") return;

		const section = document.querySelector(href);
		if (!section) return;

		e.preventDefault();
		section.scrollIntoView({ behavior: "smooth", block: "start" });
	});
})();