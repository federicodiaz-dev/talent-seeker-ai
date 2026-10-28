const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  candidates: [],
  selected: null,
  filter: "all",
  query: "",
  serverConfig: { groqConfigured: false, model: "", mode: "demo" },
  provider: localStorage.getItem("talent-seeker-provider") || "groq",
  userApiKey: localStorage.getItem("talent-seeker-groq-key") || "",
};

const colors = ["#d6ff70", "#9e8cff", "#ffb477", "#6ee7dc", "#ff91bc", "#85b8ff"];
const statusCopy = { analyzed: "Analizado", ready: "Listo", incomplete: "Incompleto" };
const decisionCopy = { CONTINUE: "Continuar", REJECT: "No continuar", HUMAN_REVIEW: "Revisión humana" };
const stageOrder = ["Nueva aplicación", "Screening", "Evaluación técnica", "Entrevista final"];

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ocurrió un error");
  return data;
}

async function bootstrap() {
  try {
    [state.candidates, state.serverConfig] = await Promise.all([
      fetchJSON("/api/candidates"),
      fetchJSON("/api/config"),
    ]);
    state.candidates = state.candidates.map(hydrateCandidateAnalysis);
    updateEngineStatus();
    renderMetrics();
    renderIntelligence();
    renderCandidates();
  } catch (error) {
    $("#candidateGrid").innerHTML = `<div class="empty-grid">${escapeHTML(error.message)}</div>`;
  }
}

function updateEngineStatus() {
  const configured = Boolean(state.userApiKey || state.serverConfig.groqConfigured);
  const card = $("#engineCard");
  card.classList.toggle("configured", configured);
  card.querySelector("small").textContent = state.userApiKey
    ? "Token personal activo"
    : state.serverConfig.groqConfigured ? state.serverConfig.model : "Pegá un token para comenzar";
  $("#groqOptionStatus").textContent = configured
    ? state.userApiKey ? "Token de este navegador listo" : `Token del deploy · ${state.serverConfig.model}`
    : "No hay ningún token disponible";
  $("#groqModel").textContent = state.serverConfig.model || "openai/gpt-oss-120b";
}

function getStoredAnalysis(candidateId) {
  try { return JSON.parse(localStorage.getItem(`talent-seeker-analysis:${candidateId}`)); } catch { return null; }
}

function hydrateCandidateAnalysis(candidate) {
  const analysis = getStoredAnalysis(candidate.id) || candidate.analysis;
  return analysis ? { ...candidate, analysis, status: "analyzed" } : candidate;
}

function renderMetrics() {
  const total = state.candidates.length;
  const ready = state.candidates.filter((item) => item.status === "ready").length;
  const analyzed = state.candidates.filter((item) => item.status === "analyzed").length;
  const coverage = total ? Math.round(state.candidates.reduce((sum, item) => sum + item.available, 0) / (total * 3) * 100) : 0;
  $("#metrics").innerHTML = [
    ["◎", total, "Candidatos activos", "+3 esta semana"],
    ["↗", ready, "Listos para evaluar", "En cola"],
    ["✦", `${coverage}%`, "Entrevistas completas", `${analyzed} analizados`],
  ].map(([icon, value, label, note]) => `
    <div class="metric"><div class="metric-icon">${icon}</div><strong>${value}</strong><small>${label}</small><em>${note}</em></div>`).join("");
}

function renderIntelligence() {
  const counts = stageOrder.map((stage) => ({ stage, count: state.candidates.filter((candidate) => candidate.stage === stage).length }));
  const max = Math.max(...counts.map((item) => item.count), 1);
  $("#pipelineChart").innerHTML = counts.map((item, index) => `
    <div class="chart-row"><span>${item.stage}</span><div class="chart-track"><i style="width:${Math.max(8, item.count / max * 100)}%;--bar-color:${colors[index]}"></i></div><strong>${item.count}</strong></div>`).join("");

  const spotlight = [...state.candidates].sort((a, b) => {
    const scoreA = a.analysis?.evaluations?.summary?.score || a.available * 20;
    const scoreB = b.analysis?.evaluations?.summary?.score || b.available * 20;
    return scoreB - scoreA;
  })[0];
  $("#spotlightCandidate").innerHTML = spotlight ? `
    <button class="spotlight-profile" data-open-candidate="${spotlight.id}">
      <span class="candidate-avatar" style="--card-color:${colors[0]}">${spotlight.initials}</span>
      <span class="spotlight-copy"><strong>${spotlight.name}</strong><small>${spotlight.role}</small></span>
      <span class="spotlight-score">${spotlight.analysis?.evaluations?.summary?.score || 92}<small>match</small></span>
    </button>
    <p class="spotlight-reason">Perfil completo con señales fuertes en experiencia, profundidad técnica y comunicación.</p>
    <div class="tag-row">${spotlight.tags.slice(0, 3).map((tag) => `<span>${escapeHTML(tag)}</span>`).join("")}</div>` : "";

  const recent = [...state.candidates].sort((a, b) => String(b.appliedAt).localeCompare(String(a.appliedAt))).slice(0, 3);
  $("#activityList").innerHTML = recent.map((candidate, index) => `
    <button class="activity-item" data-open-candidate="${candidate.id}"><i style="--activity-color:${colors[index + 2]}">${candidate.initials}</i><span><strong>${candidate.name}</strong><small>${candidate.stage}</small></span><time>${relativeDate(candidate.appliedAt)}</time></button>`).join("");
  $$('[data-open-candidate]').forEach((button) => button.addEventListener("click", () => openCandidate(button.dataset.openCandidate)));
}

function renderCandidates() {
  const candidates = state.candidates.filter((item) => {
    const filterMatch = state.filter === "all" || item.status === state.filter;
    const query = state.query.toLowerCase();
    const queryMatch = `${item.name} ${item.role} ${item.tags.join(" ")}`.toLowerCase().includes(query);
    return filterMatch && queryMatch;
  });
  $("#candidateCount").textContent = `${candidates.length} ${candidates.length === 1 ? "perfil" : "perfiles"} en el pipeline`;
  $("#candidateGrid").innerHTML = candidates.length ? candidates.map((candidate, index) => {
    const score = candidate.analysis?.evaluations?.summary?.score;
    const decision = candidate.analysis?.evaluations?.summary?.decision;
    return `<article class="candidate-card" data-candidate="${candidate.id}" style="--card-color:${colors[index % colors.length]};animation-delay:${index * 45}ms">
      <div class="card-top"><div class="candidate-avatar">${candidate.initials}</div><span class="status ${candidate.status}">${statusCopy[candidate.status]}</span></div>
      <div class="candidate-main"><h4>${escapeHTML(candidate.name)}</h4><span class="candidate-role">${escapeHTML(candidate.role)}</span></div>
      <div class="candidate-meta"><span>⌖ ${escapeHTML(candidate.location)}</span><span>◷ ${escapeHTML(candidate.experience)}</span></div>
      <div class="tag-row">${candidate.tags.slice(0, 3).map((tag) => `<span>${escapeHTML(tag)}</span>`).join("")}</div>
      <div class="card-divider"></div>
      <div class="stage-line"><span>${escapeHTML(candidate.stage)}</span>${decision ? `<strong class="decision-inline ${decision.toLowerCase()}">${decisionCopy[decision]}</strong>` : score ? `<strong>${score}% match</strong>` : ""}</div>
      <div class="interview-progress"><div class="progress-dots">${[0,1,2].map((i) => `<i class="${i < candidate.available ? "on" : ""}"></i>`).join("")}</div><span>${candidate.available}/3 entrevistas</span></div>
      <button class="card-action">Abrir perfil <span>↗</span></button>
    </article>`;
  }).join("") : `<div class="empty-grid">No encontramos candidatos con esos filtros.</div>`;
  $$('[data-candidate]').forEach((card) => card.addEventListener("click", () => openCandidate(card.dataset.candidate)));
}

async function openCandidate(id) {
  state.selected = hydrateCandidateAnalysis(await fetchJSON(`/api/candidates?id=${encodeURIComponent(id)}`));
  const candidate = state.selected;
  const summary = candidate.analysis?.evaluations?.summary;
  $("#drawerContent").innerHTML = `
    <div class="drawer-hero">
      <div class="drawer-profile"><div class="candidate-avatar" style="--card-color:${colors[Math.abs(candidate.id.length) % colors.length]}">${candidate.initials}</div><div><span class="status ${candidate.status}">${statusCopy[candidate.status]}</span><h2>${escapeHTML(candidate.name)}</h2><p>${escapeHTML(candidate.role)} · ${escapeHTML(candidate.location)}</p></div></div>
      ${summary ? `<div class="profile-score" style="--score:${summary.score}"><strong>${summary.score}</strong><small>AI match</small></div>` : ""}
    </div>
    <div class="profile-facts"><div><small>Experiencia</small><strong>${escapeHTML(candidate.experience)}</strong></div><div><small>Etapa</small><strong>${escapeHTML(candidate.stage)}</strong></div><div><small>Origen</small><strong>${escapeHTML(candidate.source)}</strong></div></div>
    <div class="tag-row profile-tags">${candidate.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join("")}</div>
    ${summary ? `<div class="analysis-preview"><div class="verdict-banner ${summary.decision.toLowerCase()}"><span>${summary.decision === "CONTINUE" ? "✓" : summary.decision === "REJECT" ? "×" : "!"}</span><div><small>Veredicto</small><strong>${escapeHTML(summary.verdict)}</strong></div></div><p><strong>${escapeHTML(summary.title)}</strong><br>${escapeHTML(summary.reason)}</p><div class="next-step"><small>Siguiente paso</small>${escapeHTML(summary.nextStep)}</div><button class="text-button" id="viewAnalysis">Ver análisis completo →</button></div>` : ""}
    <div class="drawer-section-title"><h3>Entrevistas</h3><span>${candidate.available} de 3 cargadas</span></div>
    <div class="interview-list">${candidate.interviews.map((interview, index) => `<details class="interview-item" ${index === 0 ? "open" : ""}><summary><span><i class="interview-number">0${index + 1}</i>${escapeHTML(interview.label)}</span><span>${interview.available ? `${interview.words} palabras` : "Pendiente"}</span></summary><div class="interview-body">${escapeHTML(interview.content || "Todavía no hay contenido para esta entrevista.")}</div></details>`).join("")}</div>
    <div class="drawer-action-bar"><div><small>Motor seleccionado</small><strong>${state.provider === "groq" ? `Groq · ${escapeHTML(state.serverConfig.model)}` : "Modo demo"}</strong></div><button class="primary-button" id="analyzeButton">${candidate.analysis ? "Reanalizar" : "Analizar candidato"} <span>✦</span></button></div>`;
  $("#candidateDrawer").classList.add("open");
  $("#drawerBackdrop").classList.add("open");
  $("#candidateDrawer").setAttribute("aria-hidden", "false");
  $("#analyzeButton").addEventListener("click", analyzeCandidate);
  $("#viewAnalysis")?.addEventListener("click", () => { closeDrawer(); showSavedAnalysis(candidate); });
}

function closeDrawer() {
  $("#candidateDrawer").classList.remove("open");
  $("#drawerBackdrop").classList.remove("open");
  $("#candidateDrawer").setAttribute("aria-hidden", "true");
}

function showView(view) {
  const workflow = view === "workflow";
  ["#overview", "#intelligenceGrid", "#candidateSection"].forEach((selector) => $(selector).classList.toggle("hidden", workflow));
  $("#workflowPage").classList.toggle("hidden", !workflow);
  $("#pageTitle").textContent = workflow ? "Analysis workflow" : "Talent dashboard";
  $$('.nav-item[data-view]').forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  $("#searchInput").closest("label").classList.toggle("hidden", workflow);
}

function workflowMarkup(candidate) {
  const stages = [
    ["load", "01", "Preparar entrevistas", "Carga y validación"], ["english", "02", "Inglés", "Nivel CEFR y claridad"],
    ["theory", "03", "Conocimiento técnico", "Profundidad y seniority"], ["experience", "04", "Experiencia", "Trayectoria e impacto"],
    ["code", "05", "Challenge", "Calidad y completitud"], ["summary", "06", "Recomendación", "Resultado consolidado"],
  ];
  return `<div class="workflow-header"><div><p class="eyebrow">Análisis en tiempo real</p><h2>${escapeHTML(candidate.name)}</h2><div class="tag-row">${candidate.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join("")}</div></div><p id="workflowStatus">Preparando el workflow...</p></div>
    <div class="workflow-layout"><div class="workflow-map"><div class="workflow-engine"><span class="engine-dot"></span>${state.provider === "groq" ? `Groq · ${escapeHTML(state.serverConfig.model)}` : "Modo demo"}</div>${stages.map(([key, number, title, text]) => `<div class="flow-node" data-stage="${key}"><div class="flow-icon">${number}</div><div class="flow-copy"><strong>${title}</strong><small>${text}</small></div><i class="flow-state"></i></div>`).join("")}</div>
      <div class="results-panel" id="resultsPanel"><div class="result-card result-placeholder"><span>✦</span><h4>El análisis está por comenzar</h4><p>Los resultados aparecerán acá, etapa por etapa.</p></div></div></div>`;
}

async function analyzeCandidate() {
  const button = $("#analyzeButton");
  button.disabled = true;
  button.textContent = "Iniciando...";
  closeDrawer();
  showView("workflow");
  $("#emptyWorkflow").classList.add("hidden");
  $("#workflowContent").classList.remove("hidden");
  $("#workflowContent").innerHTML = workflowMarkup(state.selected);
  const stopProgress = startWorkflowProgress();
  try {
    const result = await fetchJSON("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: state.selected.id,
        provider: state.provider,
        apiKey: state.provider === "groq" && state.userApiKey ? state.userApiKey : undefined,
      }),
    });
    stopProgress();
    completeWorkflow(result);
    localStorage.setItem(`talent-seeker-analysis:${state.selected.id}`, JSON.stringify(result));
    state.selected = { ...state.selected, analysis: result, status: "analyzed" };
    state.candidates = state.candidates.map((candidate) => candidate.id === state.selected.id ? state.selected : candidate);
    renderMetrics();
    renderIntelligence();
    renderCandidates();
    toast("Análisis guardado en este navegador");
  } catch (error) {
    stopProgress(true);
    $("#workflowStatus").textContent = "El análisis se interrumpió";
    toast(error.message);
    if (/key|token|límite|crédito|429/i.test(error.message)) openSettings();
  }
}

function startWorkflowProgress() {
  const stages = ["load", "english", "theory", "experience", "code", "summary"];
  const labels = ["Preparando entrevistas", "Analizando inglés", "Evaluando conocimientos", "Revisando experiencia", "Revisando challenge", "Armando recomendación"];
  let index = 0;
  const advance = () => {
    if (index > 0) $(`[data-stage="${stages[index - 1]}"]`)?.classList.replace("running", "completed");
    if (index < stages.length) {
      $(`[data-stage="${stages[index]}"]`)?.classList.add("running");
      $("#workflowStatus").innerHTML = `<span class="live-dot"></span>${labels[index]}`;
      index += 1;
    }
  };
  advance();
  const timer = setInterval(advance, 1700);
  return (failed = false) => {
    clearInterval(timer);
    if (failed) $$(".flow-node.running").forEach((node) => node.classList.remove("running"));
  };
}

function completeWorkflow(result) {
  $$(".flow-node").forEach((node) => { node.classList.remove("running"); node.classList.add("completed"); });
  $("#resultsPanel").innerHTML = "";
  Object.entries(result.evaluations).forEach(([key, evaluation]) => addResult(key, evaluation));
  $("#workflowStatus").textContent = "Análisis completo";
}

function addResult(key, result) {
  const labels = { english: "Inglés", theory: "Conocimiento técnico", experience: "Experiencia", code: "Challenge", summary: "Recomendación final" };
  $(".result-placeholder")?.remove();
  const verdict = key === "summary" ? `<div class="verdict-banner ${String(result.decision || "HUMAN_REVIEW").toLowerCase()}"><span>${result.decision === "CONTINUE" ? "✓" : result.decision === "REJECT" ? "×" : "!"}</span><div><small>Veredicto final</small><strong>${escapeHTML(result.verdict || "Revisión humana requerida")}</strong></div></div>` : "";
  const risks = key === "summary" && result.risks?.length ? `<div class="risk-block"><small>Riesgos a validar</small><ul>${result.risks.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></div>` : "";
  const nextStep = key === "summary" && result.nextStep ? `<div class="next-step"><small>Siguiente paso</small>${escapeHTML(result.nextStep)}</div>` : "";
  $("#resultsPanel").insertAdjacentHTML("beforeend", `<article class="result-card ${key === "summary" ? "summary" : ""}">${verdict}<div class="result-head"><div><span class="panel-eyebrow">${labels[key]}</span><h4>${escapeHTML(result.title || "Resultado")}</h4></div><div class="score-badge"><strong>${Number(result.score || 0)}</strong><small>/100</small></div></div><p>${escapeHTML(result.reason || result.summary || "")}</p><ul>${(result.highlights || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>${risks}${nextStep}<span class="level-pill">${escapeHTML(result.level || "Evaluado")}</span></article>`);
}

function showSavedAnalysis(candidate) {
  showView("workflow");
  $("#emptyWorkflow").classList.add("hidden");
  $("#workflowContent").classList.remove("hidden");
  $("#workflowContent").innerHTML = workflowMarkup(candidate);
  Object.entries(candidate.analysis.evaluations).forEach(([key, result]) => {
    $(`[data-stage="${key}"]`)?.classList.add("completed");
    addResult(key, result);
  });
  $("#workflowStatus").textContent = `Analizado con ${candidate.analysis.provider}`;
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function relativeDate(date) {
  if (!date) return "Reciente";
  const days = Math.max(0, Math.round((new Date("2026-10-28") - new Date(date)) / 86400000));
  return days === 0 ? "Hoy" : days === 1 ? "Ayer" : `Hace ${days}d`;
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 3600);
}

function openSettings() {
  const modal = $("#settingsModal");
  modal.querySelector(`[name="provider"][value="${state.provider}"]`).checked = true;
  $("#groqTokenInput").value = state.userApiKey;
  $("#groqTokenInput").type = "password";
  $("#toggleToken").textContent = "Ver";
  modal.showModal();
}

$$('.nav-item[data-view]').forEach((item) => item.addEventListener("click", () => { showView(item.dataset.view); $(".sidebar").classList.remove("open"); }));
$$('[data-back]').forEach((item) => item.addEventListener("click", () => showView("candidates")));
$$('.filter').forEach((item) => item.addEventListener("click", () => { $$('.filter').forEach((x) => x.classList.remove("active")); item.classList.add("active"); state.filter = item.dataset.filter; renderCandidates(); }));
$("#searchInput").addEventListener("input", (event) => { state.query = event.target.value; renderCandidates(); });
$("#drawerClose").addEventListener("click", closeDrawer);
$("#drawerBackdrop").addEventListener("click", closeDrawer);
$("#settingsButton").addEventListener("click", openSettings);
$("#saveSettings").addEventListener("click", () => {
  state.provider = $('[name="provider"]:checked').value;
  state.userApiKey = $("#groqTokenInput").value.trim();
  localStorage.setItem("talent-seeker-provider", state.provider);
  if (state.userApiKey) localStorage.setItem("talent-seeker-groq-key", state.userApiKey);
  else localStorage.removeItem("talent-seeker-groq-key");
  updateEngineStatus();
  toast("Configuración actualizada");
});
$("#clearToken").addEventListener("click", () => {
  state.userApiKey = "";
  $("#groqTokenInput").value = "";
  localStorage.removeItem("talent-seeker-groq-key");
  updateEngineStatus();
  toast("Token personal eliminado");
});
$("#toggleToken").addEventListener("click", () => {
  const input = $("#groqTokenInput");
  input.type = input.type === "password" ? "text" : "password";
  $("#toggleToken").textContent = input.type === "password" ? "Ver" : "Ocultar";
});
$("#menuButton").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$("#scrollCandidates").addEventListener("click", () => $("#candidateSection").scrollIntoView({ behavior: "smooth" }));
$("#reviewNext").addEventListener("click", () => { const candidate = state.candidates.find((item) => item.status === "ready") || state.candidates[0]; if (candidate) openCandidate(candidate.id); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawer(); });

bootstrap();
