
const DATA_BASE_URL =
	"https://raw.githubusercontent.com/McMaldo/MaldoProfe/refs/heads/main/public/data/";
const INDEX_URL =
	DATA_BASE_URL + "links.json";

async function init() {
	const res = await fetch(INDEX_URL);
	const INDEX = await res.json();

	const yearCache = new Map();
	const loadedSections = new Set();

	async function fetchYearData(id) {
		if (yearCache.has(id)) return yearCache.get(id);
		const res = await fetch(`${DATA_BASE_URL}${id}.json`);
		if (!res.ok) {
			throw new Error(`No se pudo cargar ${id}.json (${res.status})`);
		}
		const data = await res.json();
		yearCache.set(id, data);
		return data;
	}

	function getLinkType(name, href) {
		const n = name.toUpperCase();
		if (n.includes("| PDF") || (href && href.endsWith(".pdf"))) return "pdf";
		if (
			n.includes("HOJA DE CALCULO") ||
			n.includes("HOJA DE CÁLCULO") ||
			n.includes("| HOJA") ||
			(href && href.includes("spreadsheets"))
		)
			return "sheet";
		if (
			n.includes("| DOC") ||
			(href && href.includes("docs.google.com/document"))
		)
			return "doc";
		if (
			href &&
			(href.includes("wordwall") ||
				href.includes("educaplay") ||
				href.includes("scratch"))
		)
			return "game";
		return "link";
	}

	function getLinkTypeLabel(type) {
		const map = {
			doc: "Doc",
			pdf: "PDF",
			sheet: "Hoja",
			game: "Juego",
			link: "",
		};
		return map[type] || "";
	}

	function getLinkTypeClass(type) {
		const map = {
			doc: "type-doc",
			pdf: "type-pdf",
			sheet: "type-sheet",
			game: "type-game",
		};
		return map[type] || "";
	}

	function getLinkIcon(type, name) {
		const n = (name || "").toLowerCase();
		if (type === "doc") return "fa-solid fa-file-lines";
		if (type === "pdf") return "fa-solid fa-file-pdf";
		if (type === "sheet") return "fa-solid fa-table";
		if (type === "game") {
			if (n.includes("scratch")) return "fa-solid fa-code";
			if (n.includes("crucigrama")) return "fa-solid fa-th";
			if (n.includes("sopa")) return "fa-solid fa-spell-check";
			return "fa-solid fa-gamepad";
		}
		return "fa-solid fa-link";
	}

	function getCourseIcon(id) {
		switch (id) {
			case "1ro":
				return "fa-solid fa-rocket";
			case "2do":
				return "fa-solid fa-meteor";
			case "3ro":
				return "fa-solid fa-robot";
			case "4to":
				return "fa-solid fa-user-ninja";
			case "5to":
				return "fa-solid fa-user-astronaut";
			case "6to":
			case "7mo":
				return "fa-solid fa-user-graduate";
			default:
				return "fa-solid fa-book";
		}
	}

	function getCleanName(name) {
		return name
			.replace(
				/\s*\|\s*(DOC|PDF|Hoja de Calculo|Hoja de Cálculo|Scratch)$/i,
				"",
			)
			.trim();
	}

	function isDateVisible(dateStr, year) {
		if (!dateStr) return true; // sin fecha siempre visible
		const [day, month] = dateStr.split("/").map(Number);
		const linkDate = new Date(Number(year), month - 1, day);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return linkDate <= today;
	}

	function buildCourseCard(course, yearId) {
		const card = document.createElement("div");
		card.className = "course-card";

		const icon = getCourseIcon(course.id);
		const scheduleLines = (course.desc || "")
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean);
		const scheduleHTML = scheduleLines.length
			? `<div class="schedule"><i class="fa-regular fa-clock" aria-hidden="true"></i>${scheduleLines.join("<br>")}</div>`
			: "";

		card.innerHTML = `
			<div class="course-header">
				<div class="course-icon" aria-hidden="true"><i class="${icon}"></i></div>
				<div class="course-title">
					<h2>${course.name}</h2>
					${scheduleHTML}
				</div>
			</div>
			<div class="links-list" id="links-${Math.random().toString(36).slice(2)}"></div>
		`;

		const list = card.querySelector(".links-list");

		const visibleLinks = [];
		let pendingLabel = null;

		for (const link of course.links || []) {
			if (!link.href) {
				pendingLabel = link;
				continue;
			}
			if (!isDateVisible(link.date, yearId)) continue;
			if (pendingLabel) {
				visibleLinks.push(pendingLabel);
				pendingLabel = null;
			}
			visibleLinks.push(link);
		}

		// Ordenar por fecha y quedarse con los últimos 3
		const withDate = visibleLinks.filter((l) => l.href && l.date);
		withDate.sort((a, b) => {
			const [ad, am] = a.date.split("/").map(Number);
			const [bd, bm] = b.date.split("/").map(Number);
			const dateA = new Date(yearId, am - 1, ad);
			const dateB = new Date(yearId, bm - 1, bd);
			return dateB - dateA; // más reciente primero
		});
		const lastThree = new Set(withDate.slice(0, 3));

		const finalLinks = visibleLinks.filter((l) => l.href && lastThree.has(l));

		if (finalLinks.length === 0) {
			list.innerHTML = '<div class="empty-links">Sin materiales aún</div>';
			return card;
		}

		for (const link of finalLinks) {
			if (!link.href) {
				const label = document.createElement("div");
				label.className = "link-section-label";
				label.innerHTML = `<i class="fa-regular fa-bookmark" aria-hidden="true" style="margin-right:5px"></i>${link.name}`;
				list.appendChild(label);
				continue;
			}

			const type = getLinkType(link.name, link.href);
			const cleanName = getCleanName(link.name);
			const typeLabel = getLinkTypeLabel(type);
			const typeClass = getLinkTypeClass(type);
			const iconClass = getLinkIcon(type, link.name);
			const dateHTML = link.date
				? `<span class="link-date">${link.date}</span>`
				: "";
			const typeBadge = typeLabel
				? `<span class="link-type ${typeClass}">${typeLabel}</span>`
				: "";

			const a = document.createElement("a");
			a.className = "link-item";
			a.href = link.href;
			a.target = "_blank";
			a.rel = "noopener noreferrer";
			a.innerHTML = `
						<i class="${iconClass} link-icon" aria-hidden="true"></i>
						<span class="link-name">${cleanName}</span>
						${dateHTML}
						${typeBadge}
				`;
			list.appendChild(a);
		}

		return card;
	}

	function buildPlaceholderSection(id, name) {
		const section = document.createElement("section");
		section.className = "year-section";
		section.id = `year-${id}`;
		section.innerHTML = `
			<div class="year-header">
				<h1><i class="fa-solid fa-calendar" aria-hidden="true"></i> ${name}</h1>
				<p>Cargando...</p>
			</div>
			<div class="courses-grid">
				<div class="empty-links"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Cargando cursos...</div>
			</div>
		`;
		return section;
	}

	function buildErrorSection(id, name) {
		const section = document.createElement("section");
		section.className = "year-section";
		section.id = `year-${id}`;
		section.innerHTML = `
			<div class="year-header">
				<h1><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> ${name}</h1>
				<p>No se pudieron cargar los cursos</p>
			</div>
			<div class="courses-grid">
				<div class="empty-links">Ocurrió un error al cargar este año. Probá recargar la página.</div>
			</div>
		`;
		return section;
	}

	function buildYearSection(yearData, fallbackId) {
		const section = document.createElement("section");
		section.className = "year-section";
		const id = yearData.id || fallbackId;
		section.id = `year-${id}`;

		const yearNum = id.split("-")[0];
		const currentYearNum = String(new Date().getFullYear());
		const isCurrentYear = yearNum === currentYearNum;
		const headerIcon = isCurrentYear
			? "fa-solid fa-calendar-check"
			: "fa-solid fa-calendar";

		const courses = yearData.courses || [];

		section.innerHTML = `
			<div class="year-header">
				<h1><i class="${headerIcon}" aria-hidden="true"></i> ${yearData.name}</h1>
				<p>${courses.length} curso${courses.length !== 1 ? "s" : ""} · ${yearNum}</p>
			</div>
			<div class="courses-grid"></div>
		`;

		const grid = section.querySelector(".courses-grid");
		for (const course of courses) {
			grid.appendChild(buildCourseCard(course, yearNum));
		}

		return section;
	}

	const main = document.getElementById("main");
	const yearTabs = document.getElementById("yearTabs");
	const mobileSelect = document.getElementById("mobileYearSelect");
	let activeYear = INDEX[0].id;

	// 1) Renderizar tabs + placeholders a partir del índice (liviano, sin cursos todavía)
	for (const entry of INDEX) {
		const placeholder = buildPlaceholderSection(entry.id, entry.name);
		main.appendChild(placeholder);

		const btn = document.createElement("button");
		btn.className = "year-tab" + (entry.id === activeYear ? " active" : "");
		btn.textContent = entry.name;
		btn.dataset.year = entry.id;
		btn.addEventListener("click", () => switchYear(entry.id));
		yearTabs.appendChild(btn);

		const opt = document.createElement("option");
		opt.value = entry.id;
		opt.textContent = entry.name;
		mobileSelect.appendChild(opt);
	}

	// 2) Cargar el JSON completo de un año (una sola vez) y reemplazar su placeholder
	async function ensureYearLoaded(id) {
		if (loadedSections.has(id)) return;
		const entry = INDEX.find((e) => e.id === id);
		try {
			const data = await fetchYearData(id);
			const section = buildYearSection(data, id);
			document.getElementById(`year-${id}`)?.replaceWith(section);
		} catch (err) {
			console.error(err);
			const section = buildErrorSection(id, entry ? entry.name : id);
			document.getElementById(`year-${id}`)?.replaceWith(section);
		}
		loadedSections.add(id);
	}

	async function switchYear(id) {
		activeYear = id;

		document
			.querySelectorAll(".year-tab")
			.forEach((b) => b.classList.toggle("active", b.dataset.year === id));
		mobileSelect.value = id;

		await ensureYearLoaded(id);

		document
			.querySelectorAll(".year-section")
			.forEach((s) => s.classList.toggle("active", s.id === `year-${id}`));
	}

	mobileSelect.addEventListener("change", (e) => switchYear(e.target.value));

	await switchYear(activeYear);

	const themeToggle = document.getElementById("themeToggle");
	const themeIcon = document.getElementById("themeIcon");
	const html = document.documentElement;

	const saved = localStorage.getItem("theme") || "light";
	html.setAttribute("data-theme", saved);
	themeIcon.className =
		saved === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";

	function getHeroImgNumber(total) {
		let pool = JSON.parse(sessionStorage.getItem("heroPool") || "null");

		if (!pool || pool.length === 0) {
			pool = Array.from({ length: total }, (_, i) => i);
			// Fisher-Yates shuffle
			for (let i = pool.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[pool[i], pool[j]] = [pool[j], pool[i]];
			}
		}

		const next = pool.shift();
		sessionStorage.setItem("heroPool", JSON.stringify(pool));
		return next;
	}

	const heroImgNumber = getHeroImgNumber(8);

	const heading = document.getElementById("heading");
	heading.innerHTML = `<img id="hero-img-dark" src="/img/hero-dark-${heroImgNumber}.gif" alt="MaldoProfe"><img id="hero-img-light" src="/img/hero-light-${heroImgNumber}.gif" alt="MaldoProfe"><div id="hero-get-random-img"><i class="fa-solid fa-dice"></i></div>`;

	document
		.getElementById("hero-get-random-img")
		.addEventListener("click", () => {
			const newHeroImgNumber = getHeroImgNumber(8);
			document.getElementById("hero-img-dark").src =
				`/img/hero-dark-${newHeroImgNumber}.gif`;
			document.getElementById("hero-img-light").src =
				`/img/hero-light-${newHeroImgNumber}.gif`;
		});

	themeToggle.addEventListener("click", () => {
		const current = html.getAttribute("data-theme");
		const next = current === "dark" ? "light" : "dark";
		html.setAttribute("data-theme", next);
		themeIcon.className =
			next === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
		localStorage.setItem("theme", next);
	});
}

init();
