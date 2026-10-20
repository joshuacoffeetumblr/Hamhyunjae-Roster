(() => {
  "use strict";

  const STORAGE_KEY = "hamhyunjae-roster:v1";
  const VIEW_KEY = "hamhyunjae-roster:view";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ICON_EDIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>';
  const ICON_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  const INDUSTRY_ICONS = [
    '<path d="M4 20V10l8-6 8 6v10M9 20v-6h6v6"/>',
    '<path d="M4 20h16M6 20V9M10 20V5M14 20v-8M18 20v-12"/>',
    '<rect x="4" y="5" width="16" height="11" rx="1"/><path d="M8 20h8M12 16v4"/>',
    '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
    '<path d="M5 8h14v12H5zM9 8V5h6v3"/>',
    '<path d="M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z"/>',
    '<rect x="7" y="7" width="10" height="10"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    '<path d="M5 19c4-1 6-5 6-14M19 19c-4-1-6-5-6-14M8 12h8"/>'
  ];

  const state = {
    members: [],
    query: "",
    mode: "all",
    dept: "",
    year: "",
    industry: "",
    view: "grid",
    sort: { key: "", dir: "asc" },
    editingId: null
  };

  // ---------- storage ----------
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch { /* storage unavailable */ }
  }
  function normalize(m) {
    const list = (v) => (Array.isArray(v) ? v : String(v ?? "").split("\n")).map((x) => String(x).trim()).filter(Boolean);
    return {
      id: m.id || "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: String(m.name ?? "").trim(),
      dept: String(m.dept ?? "").trim(),
      year: String(m.year ?? "").trim(),
      org: String(m.org ?? "").trim(),
      status: String(m.status ?? "").trim(),
      industries: (Array.isArray(m.industries) ? m.industries : String(m.industries ?? "").split(","))
        .map((x) => String(x).trim()).filter(Boolean),
      education: list(m.education),
      activities: list(m.activities),
      certificates: list(m.certificates)
    };
  }
  function load() {
    const raw = safeGet(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(normalize);
      } catch { /* fall through to seed */ }
    }
    return (window.SEED_MEMBERS || []).map(normalize);
  }
  function save() {
    safeSet(STORAGE_KEY, JSON.stringify(state.members));
  }

  // ---------- helpers ----------
  const isPro = (m) => m.status === "현직";
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const countBy = (arr) => arr.reduce((acc, k) => ((acc[k] = (acc[k] || 0) + 1), acc), {});

  function haystack(m) {
    return [m.name, m.dept, m.year && m.year + "학번", m.org, m.status, ...m.industries, ...m.education, ...m.activities, ...m.certificates]
      .join(" ").toLowerCase();
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    let list = state.members.filter((m) => {
      if (state.mode === "pro" && !isPro(m)) return false;
      if (state.dept && m.dept !== state.dept) return false;
      if (state.year && m.year !== state.year) return false;
      if (state.industry && !m.industries.includes(state.industry)) return false;
      if (q && !q.split(/\s+/).every((t) => haystack(m).includes(t))) return false;
      return true;
    });
    const { key, dir } = state.sort;
    if (key) {
      const val = (m) => (key === "industries" ? m.industries.join(", ") : m[key] || "");
      list = list.slice().sort((a, b) => val(a).localeCompare(val(b), "ko", { numeric: true }) * (dir === "asc" ? 1 : -1));
    }
    return list;
  }

  function metaLine(m) {
    return [m.dept, m.year && m.year + "학번"].filter(Boolean).join(" · ");
  }
  function badge(m) {
    if (!m.org) return m.status ? `<span class="badge light">${esc(m.status)}</span>` : "";
    if (isPro(m)) return `<span class="badge">${esc(m.org)} · 현직</span>`;
    return `<span class="badge light">${esc(m.org)}${m.status ? " · " + esc(m.status) : ""}</span>`;
  }
  function avatar(m, cls = "") {
    return `<div class="avatar ${cls}" aria-hidden="true">${esc((m.name || "?").charAt(0))}</div>`;
  }
  function section(label, items) {
    if (!items.length) return "";
    return `<div class="field-label">${label}</div><ul class="items">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }

  // ---------- render ----------
  function renderCard(m) {
    return `
      <article class="card">
        <button class="edit-btn" type="button" data-edit="${esc(m.id)}">${ICON_EDIT}수정</button>
        <div class="card-head">
          ${avatar(m)}
          <div>
            <h3 class="name">${esc(m.name)}</h3>
            <div class="meta">${esc(metaLine(m))}</div>
          </div>
        </div>
        ${badge(m)}
        ${m.industries.length ? `<div class="field-label">업종</div><p class="field-value">${esc(m.industries.join(", "))}</p>` : ""}
        ${section("학력", m.education)}
        ${section("활동/수상", m.activities)}
        ${section("자격증", m.certificates)}
      </article>`;
  }

  function renderRow(m) {
    return `
      <div class="row">
        ${avatar(m, "sm")}
        <div>
          <div class="name">${esc(m.name)}</div>
          <div class="meta">${esc(metaLine(m))}</div>
        </div>
        <div class="col-org org">${m.org ? esc(m.org) + (m.status ? ` <span class="meta">· ${esc(m.status)}</span>` : "") : `<span class="meta">${esc(m.status || "—")}</span>`}</div>
        <div class="col-tags tags">${m.industries.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        <button class="edit-btn" type="button" data-edit="${esc(m.id)}">${ICON_EDIT}수정</button>
      </div>`;
  }

  function renderTable(list) {
    const cols = [
      ["name", "이름"], ["dept", "학과"], ["year", "학번"], ["org", "소속"], ["status", "상태"], ["industries", "업종"]
    ];
    const head = cols.map(([k, l]) => `<th data-sort="${k}"${state.sort.key === k ? ` data-dir="${state.sort.dir}"` : ""}>${l}</th>`).join("");
    const body = list.map((m) => `
      <tr data-edit="${esc(m.id)}">
        <td><strong>${esc(m.name)}</strong></td>
        <td>${esc(m.dept)}</td>
        <td>${esc(m.year)}</td>
        <td>${esc(m.org)}</td>
        <td>${esc(m.status)}</td>
        <td class="wrap">${esc(m.industries.join(", "))}</td>
      </tr>`).join("");
    return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function renderResults() {
    const list = filtered();
    const results = $("#results");
    $("#resultCount").textContent = `${state.members.length}명 중 ${list.length}명 표시`;

    if (!list.length) {
      results.innerHTML = `
        <div class="empty">
          <h3>조건에 맞는 구성원이 없습니다</h3>
          <p>검색어나 필터를 바꿔 보시거나 새 구성원을 등록해 주세요.</p>
          <button class="btn btn-primary" type="button" data-add>인원 등록</button>
        </div>`;
      return;
    }
    if (state.view === "grid") results.innerHTML = `<div class="grid">${list.map(renderCard).join("")}</div>`;
    else if (state.view === "list") results.innerHTML = `<div class="list">${list.map(renderRow).join("")}</div>`;
    else results.innerHTML = renderTable(list);
  }

  function renderStats() {
    const ms = state.members;
    $("#statTotal").textContent = ms.length;
    $("#statPro").textContent = ms.filter(isPro).length;
    $("#statDept").textContent = uniq(ms.map((m) => m.dept)).length;
    $("#statOrg").textContent = uniq(ms.filter(isPro).map((m) => m.org)).length;
  }

  function renderIndustries() {
    const counts = countBy(state.members.flatMap((m) => m.industries));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")).slice(0, 4);
    const grid = $("#industryGrid");
    if (!top.length) {
      grid.innerHTML = `<p class="meta">등록된 업종이 아직 없습니다.</p>`;
      return;
    }
    grid.innerHTML = top.map(([name, n], i) => {
      const people = state.members.filter((m) => m.industries.includes(name));
      const orgs = uniq(people.map((m) => m.org)).slice(0, 3);
      const desc = orgs.length ? `${orgs.join(", ")} 등에서 활동하는 구성원` : "이 분야에 관심 있는 구성원";
      return `
        <button class="industry-card" type="button" data-industry="${esc(name)}">
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${INDUSTRY_ICONS[i % INDUSTRY_ICONS.length]}</svg>
          <h3>${esc(name)}</h3>
          <p>${esc(desc)}</p>
          <span class="more">${n}명 보기 ${ICON_ARROW}</span>
        </button>`;
    }).join("");
  }

  function renderMenus() {
    const defs = {
      dept: { label: "학과", values: countBy(state.members.map((m) => m.dept).filter(Boolean)), fmt: (v) => v },
      year: { label: "학번", values: countBy(state.members.map((m) => m.year).filter(Boolean)), fmt: (v) => v + "학번" },
      industry: { label: "업종", values: countBy(state.members.flatMap((m) => m.industries)), fmt: (v) => v }
    };
    for (const [key, def] of Object.entries(defs)) {
      const wrap = $(`.chip-menu[data-filter="${key}"]`);
      const keys = Object.keys(def.values).sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));
      const current = state[key];
      const chip = $(".chip", wrap);
      chip.textContent = current ? def.fmt(current) : def.label;
      chip.classList.toggle("is-active", !!current);
      $(".menu", wrap).innerHTML =
        `<button type="button" data-value="" class="${current ? "" : "is-selected"}">전체</button>` +
        keys.map((k) => `<button type="button" data-value="${esc(k)}" class="${k === current ? "is-selected" : ""}">${esc(def.fmt(k))}<span class="count">${def.values[k]}</span></button>`).join("");
    }

    $('[data-chip="all"]').classList.toggle("is-active", state.mode === "all" && !state.dept && !state.year && !state.industry);
    $('[data-chip="pro"]').classList.toggle("is-active", state.mode === "pro");
    $("#resetFilters").hidden = !(state.mode !== "all" || state.dept || state.year || state.industry || state.query);

    // hero dept select + editor datalist
    const depts = uniq(state.members.map((m) => m.dept)).sort((a, b) => a.localeCompare(b, "ko"));
    $("#heroDept").innerHTML = `<option value="">모든 학과</option>` + depts.map((d) => `<option ${d === state.dept ? "selected" : ""}>${esc(d)}</option>`).join("");
    $("#deptList").innerHTML = depts.map((d) => `<option value="${esc(d)}"></option>`).join("");
  }

  function renderMode() {
    $$(".mode-tile").forEach((t) => {
      const on = t.dataset.mode === state.mode;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on);
    });
  }

  function renderView() {
    $$(".view-toggle button").forEach((b) => b.classList.toggle("is-active", b.dataset.view === state.view));
  }

  function renderCaption() {
    const pros = state.members.filter(isPro);
    const latest = pros[pros.length - 1];
    $("#heroCaption").textContent = latest ? `${latest.name} · ${latest.org}` : "";
  }

  function render() {
    renderStats();
    renderIndustries();
    renderMenus();
    renderMode();
    renderView();
    renderCaption();
    renderResults();
  }

  // ---------- editor ----------
  const editor = $("#editor");
  const form = $("#editorForm");

  function openEditor(id) {
    const m = id ? state.members.find((x) => x.id === id) : null;
    state.editingId = m ? m.id : null;
    $("#editorTitle").textContent = m ? "정보 수정" : "인원 등록";
    $("#deleteBtn").hidden = !m;
    form.reset();
    const v = m || {};
    form.elements.name.value = v.name || "";
    form.elements.dept.value = v.dept || "";
    form.elements.year.value = v.year || "";
    form.elements.org.value = v.org || "";
    form.elements.status.value = v.status || "";
    form.elements.industries.value = (v.industries || []).join(", ");
    form.elements.education.value = (v.education || []).join("\n");
    form.elements.activities.value = (v.activities || []).join("\n");
    form.elements.certificates.value = (v.certificates || []).join("\n");
    editor.showModal();
    setTimeout(() => form.elements.name.focus(), 30);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = normalize({
      id: state.editingId || undefined,
      name: form.elements.name.value,
      dept: form.elements.dept.value,
      year: form.elements.year.value.replace(/\D/g, ""),
      org: form.elements.org.value,
      status: form.elements.status.value,
      industries: form.elements.industries.value,
      education: form.elements.education.value,
      activities: form.elements.activities.value,
      certificates: form.elements.certificates.value
    });
    if (!data.name) { form.elements.name.focus(); return; }
    if (state.editingId) {
      const i = state.members.findIndex((x) => x.id === state.editingId);
      state.members[i] = data;
      toast(`${data.name}님의 정보를 수정했습니다`);
    } else {
      state.members.unshift(data);
      toast(`${data.name}님을 등록했습니다`);
    }
    save();
    editor.close();
    render();
  });

  $("#deleteBtn").addEventListener("click", () => {
    const m = state.members.find((x) => x.id === state.editingId);
    if (!m || !confirm(`${m.name}님을 연명부에서 삭제할까요?`)) return;
    state.members = state.members.filter((x) => x.id !== m.id);
    save();
    editor.close();
    render();
    toast(`${m.name}님을 삭제했습니다`);
  });

  $$("[data-close]", editor).forEach((b) => b.addEventListener("click", () => editor.close()));
  editor.addEventListener("click", (e) => { if (e.target === editor) editor.close(); });

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-show"), 2200);
  }

  // ---------- events ----------
  function goRoster() {
    $("#roster").scrollIntoView({ behavior: "smooth" });
  }
  function setMode(mode) {
    state.mode = mode;
    render();
  }

  $$(".mode-tile").forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));

  $("#heroSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    state.query = $("#heroQuery").value;
    state.dept = $("#heroDept").value;
    $("#query").value = state.query;
    render();
    goRoster();
  });

  $("#query").addEventListener("input", (e) => {
    state.query = e.target.value;
    $("#heroQuery").value = state.query;
    renderMenus();
    renderResults();
  });

  $$("[data-nav-mode]").forEach((a) => a.addEventListener("click", () => setMode(a.dataset.navMode)));
  $("#viewAllLink").addEventListener("click", () => {
    Object.assign(state, { mode: "all", dept: "", year: "", industry: "" });
    render();
  });

  $("#industryGrid").addEventListener("click", (e) => {
    const card = e.target.closest("[data-industry]");
    if (!card) return;
    state.industry = card.dataset.industry;
    render();
    goRoster();
  });

  $('[data-chip="all"]').addEventListener("click", () => {
    Object.assign(state, { mode: "all", dept: "", year: "", industry: "" });
    render();
  });
  $('[data-chip="pro"]').addEventListener("click", () => setMode(state.mode === "pro" ? "all" : "pro"));
  $("#resetFilters").addEventListener("click", () => {
    Object.assign(state, { mode: "all", dept: "", year: "", industry: "", query: "" });
    $("#query").value = $("#heroQuery").value = "";
    render();
  });

  $$(".chip-menu").forEach((wrap) => {
    $(".chip", wrap).addEventListener("click", (e) => {
      e.stopPropagation();
      const open = wrap.classList.contains("is-open");
      $$(".chip-menu").forEach((w) => w.classList.remove("is-open"));
      wrap.classList.toggle("is-open", !open);
    });
    $(".menu", wrap).addEventListener("click", (e) => {
      const b = e.target.closest("[data-value]");
      if (!b) return;
      state[wrap.dataset.filter] = b.dataset.value;
      wrap.classList.remove("is-open");
      render();
    });
  });
  document.addEventListener("click", () => $$(".chip-menu").forEach((w) => w.classList.remove("is-open")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") $$(".chip-menu").forEach((w) => w.classList.remove("is-open")); });

  $$(".view-toggle button").forEach((b) => b.addEventListener("click", () => {
    state.view = b.dataset.view;
    safeSet(VIEW_KEY, state.view);
    renderView();
    renderResults();
  }));

  $("#results").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-sort]");
    if (th) {
      const k = th.dataset.sort;
      state.sort = { key: k, dir: state.sort.key === k && state.sort.dir === "asc" ? "desc" : "asc" };
      renderResults();
      return;
    }
    const ed = e.target.closest("[data-edit]");
    if (ed) return openEditor(ed.dataset.edit);
    if (e.target.closest("[data-add]")) openEditor(null);
  });

  $("#addBtn").addEventListener("click", () => openEditor(null));

  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.members, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hamhyunjae-roster-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("연명부를 JSON 파일로 내보냈습니다");
  });

  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("not an array");
      const list = parsed.map(normalize).filter((m) => m.name);
      if (!confirm(`${list.length}명의 데이터로 현재 연명부를 바꿀까요?`)) return;
      state.members = list;
      save();
      render();
      toast(`${list.length}명을 가져왔습니다`);
    } catch {
      alert("올바른 연명부 JSON 파일이 아닙니다.");
    }
  });

  $("#restoreBtn").addEventListener("click", () => {
    if (!confirm("이 브라우저에서 수정한 내용을 지우고 기본 데이터로 되돌릴까요?")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    state.members = (window.SEED_MEMBERS || []).map(normalize);
    render();
    toast("기본 데이터로 되돌렸습니다");
  });

  // ---------- init ----------
  $("#year").textContent = new Date().getFullYear();
  state.members = load();
  const savedView = safeGet(VIEW_KEY);
  if (["grid", "list", "table"].includes(savedView)) state.view = savedView;
  render();
})();
