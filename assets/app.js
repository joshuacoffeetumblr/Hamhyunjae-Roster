(() => {
  "use strict";

  const STORAGE_KEY = "hamhyunjae-roster:v2";
  const VIEW_KEY = "hamhyunjae-roster:view";
  const GROUPS = ["2차생", "1차생"];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ICON_EDIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>';

  const state = {
    members: [],
    query: "",
    mode: "all",
    dept: "",
    year: "",
    deferred: "",
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
  const toInt = (v) => {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    const n = parseInt(String(v).replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  };
  function normalize(m) {
    const list = (v) => (Array.isArray(v) ? v : String(v ?? "").split("\n")).map((x) => String(x).trim()).filter(Boolean);
    return {
      id: m.id || "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: String(m.name ?? "").trim(),
      group: GROUPS.includes(m.group) ? m.group : "1차생",
      dept: String(m.dept ?? "").trim(),
      year: String(m.year ?? "").replace(/\D/g, ""),
      age: toInt(m.age),
      deferred: toInt(m.deferred),
      studyMonths: toInt(m.studyMonths),
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
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const countBy = (arr) => arr.reduce((acc, k) => ((acc[k] = (acc[k] || 0) + 1), acc), {});

  function fmtPeriod(months) {
    if (months === null || months === undefined) return "—";
    const y = Math.floor(months / 12), mo = months % 12;
    if (!y) return `${mo}개월`;
    return mo ? `${y}년 ${mo}개월` : `${y}년`;
  }
  const fmtDeferred = (d) => (d === null ? "—" : `${d}과목`);
  const fmtAgeYear = (m, sep = " · ") => [m.age !== null && `${m.age}세`, m.year && `${m.year}학번`].filter(Boolean).join(sep) || "—";

  function haystack(m) {
    return [m.name, m.group, m.dept, m.year && m.year + "학번", m.age !== null && m.age + "세",
      ...m.education, ...m.activities, ...m.certificates].filter(Boolean).join(" ").toLowerCase();
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    let list = state.members.filter((m) => {
      if (state.mode !== "all" && m.group !== state.mode) return false;
      if (state.dept && m.dept !== state.dept) return false;
      if (state.year && m.year !== state.year) return false;
      if (state.deferred !== "" && String(m.deferred) !== state.deferred) return false;
      if (q && !q.split(/\s+/).every((t) => haystack(m).includes(t))) return false;
      return true;
    });
    const { key, dir } = state.sort;
    if (key) {
      const sign = dir === "asc" ? 1 : -1;
      list = list.slice().sort((a, b) => {
        const va = a[key], vb = b[key];
        if (va === null || va === "") return 1;
        if (vb === null || vb === "") return -1;
        if (typeof va === "number") return (va - vb) * sign;
        return String(va).localeCompare(String(vb), "ko", { numeric: true }) * sign;
      });
    }
    return list;
  }

  function badge(m) {
    return m.group === "2차생" ? `<span class="badge">2차생 · 멘토</span>` : `<span class="badge light">1차생</span>`;
  }
  function avatar(m, cls = "") {
    return `<div class="avatar ${cls}" aria-hidden="true">${esc((m.name || "?").charAt(0))}</div>`;
  }
  function section(label, items) {
    if (!items.length) return "";
    return `<div class="field-label">${label}</div><ul class="items">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }
  function facts(m) {
    return `
      <dl class="facts">
        <div><dt>유예과목</dt><dd>${esc(fmtDeferred(m.deferred))}</dd></div>
        <div><dt>수험기간</dt><dd>${esc(fmtPeriod(m.studyMonths))}</dd></div>
        <div><dt>나이 · 학번</dt><dd>${esc(fmtAgeYear(m, " / "))}</dd></div>
      </dl>`;
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
            <div class="meta">${esc(m.dept || "학과 미입력")}</div>
          </div>
        </div>
        ${badge(m)}
        ${facts(m)}
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
          <div class="meta">${esc([m.dept, fmtAgeYear(m)].filter(Boolean).join(" · "))}</div>
        </div>
        <div class="col-org">${badge(m)}</div>
        <div class="col-tags meta">유예 ${esc(fmtDeferred(m.deferred))} · 수험기간 ${esc(fmtPeriod(m.studyMonths))}</div>
        <button class="edit-btn" type="button" data-edit="${esc(m.id)}">${ICON_EDIT}수정</button>
      </div>`;
  }

  function renderTable(list) {
    const cols = [
      ["name", "이름"], ["group", "구분"], ["dept", "학과"], ["year", "학번"], ["age", "나이"], ["deferred", "유예과목"], ["studyMonths", "수험기간"]
    ];
    const head = cols.map(([k, l]) => `<th data-sort="${k}"${state.sort.key === k ? ` data-dir="${state.sort.dir}"` : ""}>${l}</th>`).join("");
    const body = list.map((m) => `
      <tr data-edit="${esc(m.id)}">
        <td><strong>${esc(m.name)}</strong></td>
        <td>${esc(m.group)}</td>
        <td>${esc(m.dept)}</td>
        <td>${esc(m.year)}</td>
        <td>${m.age === null ? "" : esc(m.age + "세")}</td>
        <td>${esc(fmtDeferred(m.deferred))}</td>
        <td>${esc(fmtPeriod(m.studyMonths))}</td>
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
    const seconds = ms.filter((m) => m.group === "2차생");
    $("#statTotal").textContent = ms.length;
    $("#statSecond").textContent = seconds.length;
    $("#statFirst").textContent = ms.length - seconds.length;
    const periods = seconds.map((m) => m.studyMonths).filter((v) => v !== null);
    $("#statPeriod").textContent = periods.length
      ? fmtPeriod(Math.round(periods.reduce((a, b) => a + b, 0) / periods.length))
      : "—";
  }

  function renderMenus() {
    const defs = {
      deferred: {
        label: "유예과목",
        values: countBy(state.members.filter((m) => m.deferred !== null).map((m) => String(m.deferred))),
        fmt: (v) => v + "과목"
      },
      year: { label: "학번", values: countBy(state.members.map((m) => m.year).filter(Boolean)), fmt: (v) => v + "학번" },
      dept: { label: "학과", values: countBy(state.members.map((m) => m.dept).filter(Boolean)), fmt: (v) => v }
    };
    for (const [key, def] of Object.entries(defs)) {
      const wrap = $(`.chip-menu[data-filter="${key}"]`);
      const keys = Object.keys(def.values).sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));
      const current = state[key];
      const chip = $(".chip", wrap);
      chip.textContent = current !== "" ? def.fmt(current) : def.label;
      chip.classList.toggle("is-active", current !== "");
      $(".menu", wrap).innerHTML =
        `<button type="button" data-value="" class="${current === "" ? "is-selected" : ""}">전체</button>` +
        keys.map((k) => `<button type="button" data-value="${esc(k)}" class="${k === current ? "is-selected" : ""}">${esc(def.fmt(k))}<span class="count">${def.values[k]}</span></button>`).join("");
    }

    const noFilter = !state.dept && !state.year && state.deferred === "";
    $('[data-chip="all"]').classList.toggle("is-active", state.mode === "all" && noFilter);
    GROUPS.forEach((g) => $(`[data-chip="${g}"]`).classList.toggle("is-active", state.mode === g));
    $("#resetFilters").hidden = state.mode === "all" && noFilter && !state.query;

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

  function render() {
    renderStats();
    renderMenus();
    renderMode();
    renderView();
    renderResults();
  }

  // ---------- editor ----------
  const editor = $("#editor");
  const form = $("#editorForm");
  const f = form.elements;

  function openEditor(id) {
    const m = id ? state.members.find((x) => x.id === id) : null;
    state.editingId = m ? m.id : null;
    $("#editorTitle").textContent = m ? "정보 수정" : "인원 등록";
    $("#deleteBtn").hidden = !m;
    form.reset();
    const v = m || { group: state.mode === "1차생" ? "1차생" : "2차생", age: null, deferred: null, studyMonths: null };
    f.name.value = v.name || "";
    f.group.value = v.group;
    f.dept.value = v.dept || "";
    f.year.value = v.year || "";
    f.age.value = v.age ?? "";
    f.deferred.value = v.deferred ?? "";
    f.studyYears.value = v.studyMonths === null ? "" : Math.floor(v.studyMonths / 12);
    f.studyMonthsPart.value = v.studyMonths === null ? "" : v.studyMonths % 12;
    f.education.value = (v.education || []).join("\n");
    f.activities.value = (v.activities || []).join("\n");
    f.certificates.value = (v.certificates || []).join("\n");
    editor.showModal();
    setTimeout(() => f.name.focus(), 30);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const y = toInt(f.studyYears.value), mo = toInt(f.studyMonthsPart.value);
    const data = normalize({
      id: state.editingId || undefined,
      name: f.name.value,
      group: f.group.value,
      dept: f.dept.value,
      year: f.year.value,
      age: f.age.value,
      deferred: f.deferred.value,
      studyMonths: y === null && mo === null ? null : (y || 0) * 12 + Math.min(mo || 0, 11),
      education: f.education.value,
      activities: f.activities.value,
      certificates: f.certificates.value
    });
    if (!data.name) { f.name.focus(); return; }
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

  $$(".mode-tile").forEach((t) => t.addEventListener("click", () => {
    setMode(state.mode === t.dataset.mode ? "all" : t.dataset.mode);
  }));

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

  $('[data-chip="all"]').addEventListener("click", () => {
    Object.assign(state, { mode: "all", dept: "", year: "", deferred: "" });
    render();
  });
  GROUPS.forEach((g) => $(`[data-chip="${g}"]`).addEventListener("click", () => setMode(state.mode === g ? "all" : g)));
  $("#resetFilters").addEventListener("click", () => {
    Object.assign(state, { mode: "all", dept: "", year: "", deferred: "", query: "" });
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
