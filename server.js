const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, ".env");
const WEB_DIR = path.join(ROOT, "web");
const INPUT_DIR = path.join(ROOT, "input");
const OUTPUT_DIR = path.join(ROOT, "output");
const SAMPLE_FILE = path.join(INPUT_DIR, "sample-candidates.json");
const SAMPLE_DETAILS_FILE = path.join(INPUT_DIR, "sample-interview-details.json");

function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return;
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (!match || match[1].startsWith("#")) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

loadEnv();

const PORT = Number(process.env.PORT || 3000);
const GROQ_CONFIG = {
  apiKey: process.env.GROQ_API_KEY || "",
  model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  baseUrl: (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, ""),
};
const jobs = new Map();

const INTERVIEWS = [
  { file: "theory_interview.md", key: "theory", label: "Entrevista teórica" },
  { file: "challenge_interview.md", key: "code", label: "Challenge técnico" },
  { file: "work_experience.md", key: "experience", label: "Experiencia laboral" },
];

function safeCandidateId(value) {
  const id = decodeURIComponent(value || "");
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Candidato inválido");
  return id;
}

function titleCase(value) {
  return value.split(/[_-]/).filter(Boolean).map((word) =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(" ");
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function getSamples() {
  try {
    const samples = JSON.parse(readText(SAMPLE_FILE));
    const details = JSON.parse(readText(SAMPLE_DETAILS_FILE) || "{}");
    return samples.map((sample) => ({
      ...sample,
      interviews: Object.fromEntries(Object.entries(sample.interviews || {}).map(([key, value]) => [
        key,
        [value, details[sample.id]?.[key]].filter(Boolean).join("\n\n"),
      ])),
    }));
  } catch { return []; }
}

function getAnalysis(id) {
  const file = path.join(OUTPUT_DIR, id, "analysis.json");
  if (!fs.existsSync(file)) return null;
  try { return normalizeAnalysis(JSON.parse(fs.readFileSync(file, "utf8"))); } catch { return null; }
}

function normalizeVerdict(summary = {}) {
  const score = Math.max(0, Math.min(100, Number(summary.score) || 0));
  let decision = String(summary.decision || "").toUpperCase();
  if (!["CONTINUE", "REJECT", "HUMAN_REVIEW"].includes(decision)) {
    decision = score >= 70 ? "CONTINUE" : score < 50 ? "REJECT" : "HUMAN_REVIEW";
  }
  const copy = {
    CONTINUE: {
      verdict: "Continuar con el proceso",
      nextStep: "Coordinar la siguiente entrevista y validar los riesgos señalados.",
    },
    REJECT: {
      verdict: "No continuar con el proceso",
      nextStep: "Cerrar el proceso y registrar feedback interno basado en la evidencia.",
    },
    HUMAN_REVIEW: {
      verdict: "Revisión humana requerida",
      nextStep: "Realizar una entrevista focalizada antes de tomar una decisión final.",
    },
  }[decision];
  return {
    ...summary,
    score,
    decision,
    verdict: copy.verdict,
    reason: summary.reason || summary.summary || "No se proporcionó una justificación.",
    nextStep: summary.nextStep || copy.nextStep,
    risks: Array.isArray(summary.risks) ? summary.risks.slice(0, 3) : [],
  };
}

function normalizeAnalysis(analysis) {
  if (!analysis?.evaluations?.summary) return analysis;
  return {
    ...analysis,
    evaluations: {
      ...analysis.evaluations,
      summary: normalizeVerdict(analysis.evaluations.summary),
    },
  };
}

function getCandidate(id) {
  const safeId = safeCandidateId(id);
  const candidateDir = path.join(INPUT_DIR, safeId);
  const hasFolder = fs.existsSync(candidateDir) && fs.statSync(candidateDir).isDirectory();
  const sample = getSamples().find((item) => item.id === safeId);
  if (!hasFolder && !sample) return null;
  let profile = sample || {};
  if (hasFolder) {
    try { profile = { ...profile, ...JSON.parse(readText(path.join(candidateDir, "profile.json"))) }; } catch { /* optional metadata */ }
  }

  const interviews = INTERVIEWS.map((item) => {
    const content = hasFolder
      ? readText(path.join(candidateDir, item.file))
      : String(profile.interviews?.[item.key] || "");
    return { ...item, content, available: Boolean(content.trim()), words: content.trim() ? content.trim().split(/\s+/).length : 0 };
  });
  const analysis = getAnalysis(safeId);
  const available = interviews.filter((item) => item.available).length;
  const name = profile.name || titleCase(safeId);
  return {
    id: safeId,
    name,
    initials: name.split(" ").map((part) => part[0]).slice(0, 2).join(""),
    role: profile.role || (safeId.includes("lead") ? "Tech Lead" : "Software Engineer"),
    location: profile.location || "Remote",
    experience: profile.experience || "No especificada",
    stage: profile.stage || "Screening",
    tags: profile.tags || [],
    source: profile.source || "Carga manual",
    appliedAt: profile.appliedAt || null,
    interviews,
    available,
    status: analysis ? "analyzed" : available === INTERVIEWS.length ? "ready" : "incomplete",
    analysis,
  };
}

function listCandidates() {
  if (!fs.existsSync(INPUT_DIR)) return [];
  const folderIds = fs.readdirSync(INPUT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);
  const sampleIds = getSamples().map((item) => item.id);
  return [...new Set([...folderIds, ...sampleIds])]
    .map((id) => getCandidate(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendEvent(res, event) {
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
}

function emit(job, type, data) {
  const event = { type, data };
  job.events.push(event);
  job.listeners.forEach((listener) => sendEvent(listener, event));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function demoEvaluation(step, candidate) {
  const byKey = Object.fromEntries(candidate.interviews.map((item) => [item.key, item]));
  const theory = byKey.theory.content;
  const experience = byKey.experience.content;
  const code = byKey.code.content;
  const answers = (theory.match(/Answer|Response/gi) || []).length;
  const technologies = [...new Set((`${theory} ${experience}`.match(/\b(?:Azure|AWS|Python|C#|\.NET|Angular|SQL|Terraform|Bicep|DevOps|Kubernetes)\b/gi) || []).map((x) => x.toUpperCase()))];

  if (step === "english") return {
    score: 68, level: "B1", title: "Inglés técnico funcional",
    summary: "Comunica ideas técnicas con claridad suficiente, aunque hay errores de gramática, ortografía y construcción de frases.",
    highlights: ["Vocabulario técnico adecuado", "Ideas comprensibles", "Debe mejorar precisión gramatical"],
  };
  if (step === "theory") return {
    score: Math.min(88, 48 + answers * 3), level: "Semi-Senior", title: "Base técnica consistente",
    summary: `Se detectaron ${answers} respuestas y cobertura de arquitectura, cloud, DevOps y datos. Algunas respuestas necesitan más profundidad y ejemplos concretos.`,
    highlights: ["Buen panorama de cloud", "Conoce patrones y herramientas", "Falta profundizar decisiones y trade-offs"],
  };
  if (step === "experience") return {
    score: experience ? 72 : 0, level: experience ? "Relevant" : "Missing", title: experience ? "Experiencia relevante" : "Sin información",
    summary: experience ? `Experiencia vinculada con ${technologies.slice(0, 5).join(", ") || "desarrollo de software"}. El relato es válido, pero puede cuantificar mejor impacto y responsabilidades.` : "No se cargó una entrevista de experiencia laboral.",
    highlights: technologies.slice(0, 4),
  };
  return {
    score: code ? 64 : 0, level: code ? "Junior" : "Missing", title: code ? "Challenge revisado" : "Challenge pendiente",
    summary: code ? "La solución cubre el enfoque principal, con oportunidades de mejora en completitud y manejo de casos límite." : "No hay un challenge técnico cargado para este candidato.",
    highlights: code ? ["Solución legible", "Estructura simple", "Revisar casos límite"] : ["Archivo no disponible"],
  };
}

async function callGroq(messages, apiKey = GROQ_CONFIG.apiKey) {
  if (!apiKey) throw new Error("No hay una API key de Groq configurada");
  const response = await fetch(`${GROQ_CONFIG.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_CONFIG.model,
      messages,
      temperature: 0.2,
      max_completion_tokens: 1200,
      response_format: { type: "json_object" },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || `Groq respondió ${response.status}`);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq devolvió una respuesta vacía");
  return JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
}

async function groqEvaluation(step, candidate, apiKey) {
  const interview = step === "english"
    ? candidate.interviews.map((item) => item.content).join("\n\n")
    : candidate.interviews.find((item) => item.key === step)?.content || "";
  const instructions = {
    english: "Evalúa únicamente el nivel de inglés (CEFR), claridad y errores.",
    theory: "Evalúa profundidad técnica, exactitud y seniority de las respuestas teóricas.",
    experience: "Resume experiencia, tecnologías, impacto y nivel de responsabilidad.",
    code: "Evalúa completitud, calidad y seniority del challenge, sin proponer código alternativo.",
  }[step];
  if (!interview.trim()) return demoEvaluation(step, candidate);
  return callGroq([
    { role: "system", content: `${instructions} Sé exigente, breve y justo. Responde en español con JSON válido: {"score": número de 0 a 100, "level": string, "title": string, "summary": string, "highlights": array de exactamente 3 strings}.` },
    { role: "user", content: `Candidato: ${candidate.name}\nRol: ${candidate.role}\n\n${interview.slice(0, 24000)}` },
  ], apiKey);
}

async function groqSummary(candidate, evaluations, apiKey) {
  return callGroq([
    { role: "system", content: "Actúa como recruiting lead y toma una decisión explícita sobre la continuidad del candidato para el puesto indicado. El campo decision es obligatorio y sólo puede ser CONTINUE, REJECT o HUMAN_REVIEW. Usa CONTINUE cuando la evidencia alcanza para avanzar, REJECT cuando existen brechas claras para el puesto y HUMAN_REVIEW cuando falta información crítica o hay señales contradictorias. No ocultes la decisión dentro del título. Responde en español con JSON válido: {\"score\": número de 0 a 100, \"level\": \"Strong match\" o \"Potential match\" o \"Review needed\", \"decision\": \"CONTINUE\" o \"REJECT\" o \"HUMAN_REVIEW\", \"verdict\": string inequívoco, \"title\": string, \"summary\": string de 2 a 4 oraciones, \"reason\": string que justifica directamente la decisión, \"highlights\": array de exactamente 3 fortalezas basadas en evidencia, \"risks\": array de 1 a 3 riesgos o brechas, \"nextStep\": string con la acción concreta recomendada}." },
    { role: "user", content: JSON.stringify({ candidate: { name: candidate.name, targetRole: candidate.role, experience: candidate.experience }, evaluations }) },
  ], apiKey);
}

async function analyzeCandidateDirect(candidate, config = {}) {
  const provider = config.provider === "demo" ? "demo" : "groq";
  const apiKey = String(config.apiKey || GROQ_CONFIG.apiKey || "").trim();
  if (provider === "groq" && !apiKey) throw new Error("Pegá una API key de Groq en Configuración para continuar.");
  const evaluations = {};
  for (const key of ["english", "theory", "experience", "code"]) {
    evaluations[key] = provider === "groq"
      ? await groqEvaluation(key, candidate, apiKey)
      : demoEvaluation(key, candidate);
  }
  if (provider === "groq") evaluations.summary = await groqSummary(candidate, evaluations, apiKey);
  else {
    const scored = Object.values(evaluations).filter((item) => item.score > 0);
    const overall = scored.length ? Math.round(scored.reduce((sum, item) => sum + Number(item.score || 0), 0) / scored.length) : 0;
    evaluations.summary = {
      score: overall,
      level: overall >= 75 ? "Strong match" : overall >= 55 ? "Potential match" : "Review needed",
      decision: overall >= 70 ? "CONTINUE" : overall < 50 ? "REJECT" : "HUMAN_REVIEW",
      title: overall >= 70 ? "Recomendado para continuar" : "Requiere validación adicional",
      summary: overall >= 70 ? "El perfil tiene fundamentos y experiencia suficientes para avanzar." : "La evidencia requiere una revisión humana antes de decidir.",
      highlights: ["Revisar resultados por área", "Validar puntos débiles en vivo", "Confirmar alcance de experiencia"],
      risks: ["Validar profundidad en una entrevista en vivo"],
    };
  }
  evaluations.summary = normalizeVerdict(evaluations.summary);
  return normalizeAnalysis({ candidateId: candidate.id, createdAt: new Date().toISOString(), provider, evaluations });
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAnalysis(job, candidate, config) {
  const provider = config.provider === "demo" ? "demo" : "groq";
  const stages = [
    ["load", "Preparando entrevistas"],
    ["english", "Analizando inglés"],
    ["theory", "Evaluando conocimientos"],
    ["experience", "Revisando experiencia"],
    ["code", "Revisando challenge"],
    ["summary", "Armando recomendación"],
  ];
  const evaluations = {};

  try {
    for (const [key, label] of stages) {
      emit(job, "stage", { key, label, status: "running" });
      if (key === "load") {
        await delay(450);
        emit(job, "stage", { key, label, status: "completed", detail: `${candidate.available} entrevistas encontradas` });
        continue;
      }
      if (key === "summary") {
        if (provider === "groq") evaluations.summary = await groqSummary(candidate, evaluations);
        else {
          await delay(500);
          const scored = Object.values(evaluations).filter((item) => item.score > 0);
          const overall = scored.length ? Math.round(scored.reduce((sum, item) => sum + Number(item.score || 0), 0) / scored.length) : 0;
          evaluations.summary = {
            score: overall,
            level: overall >= 75 ? "Strong match" : overall >= 55 ? "Potential match" : "Review needed",
            decision: overall >= 70 ? "CONTINUE" : overall < 50 ? "REJECT" : "HUMAN_REVIEW",
            title: overall >= 55 ? "Recomendado para continuar" : "Requiere revisión",
            summary: overall >= 55 ? "El perfil tiene fundamentos y experiencia suficientes para avanzar a una conversación con el equipo." : "Falta información o profundidad para tomar una decisión definitiva.",
            highlights: ["Revisar resultados por área", "Validar puntos débiles en vivo", "Confirmar alcance de experiencia"],
            risks: overall >= 70 ? ["Validar profundidad en entrevista en vivo"] : ["La evidencia disponible no permite una decisión definitiva"],
          };
        }
        evaluations.summary = normalizeVerdict(evaluations.summary);
      } else {
        evaluations[key] = provider === "groq"
          ? await groqEvaluation(key, candidate)
          : demoEvaluation(key, candidate);
        if (provider === "demo") await delay(650);
      }
      emit(job, "stage", { key, label, status: "completed", result: evaluations[key] });
    }

    const result = normalizeAnalysis({
      candidateId: candidate.id,
      createdAt: new Date().toISOString(),
      provider,
      evaluations,
    });
    const destination = path.join(OUTPUT_DIR, candidate.id);
    fs.mkdirSync(destination, { recursive: true });
    fs.writeFileSync(path.join(destination, "analysis.json"), JSON.stringify(result, null, 2));
    emit(job, "complete", result);
  } catch (error) {
    emit(job, "failed", { message: error.message || "No se pudo completar el análisis" });
  }
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(WEB_DIR, requested);
  if (!filePath.startsWith(path.resolve(WEB_DIR)) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end("Not found"); return;
  }
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
  res.writeHead(200, { "Content-Type": `${types[path.extname(filePath)] || "application/octet-stream"}; charset=utf-8` });
  fs.createReadStream(filePath).pipe(res);
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/candidates") return json(res, 200, listCandidates());
    if (req.method === "GET" && url.pathname === "/api/config") return json(res, 200, {
      groqConfigured: Boolean(GROQ_CONFIG.apiKey),
      model: GROQ_CONFIG.model,
      mode: GROQ_CONFIG.apiKey ? "groq" : "demo",
    });

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const config = await readBody(req);
      const candidate = getCandidate(config.candidateId);
      if (!candidate) return json(res, 404, { error: "Candidato no encontrado" });
      const result = await analyzeCandidateDirect(candidate, config);
      return json(res, 200, result);
    }

    if (req.method === "GET" && url.pathname === "/api/candidate" && url.searchParams.get("id")) {
      const candidate = getCandidate(url.searchParams.get("id"));
      return candidate ? json(res, 200, candidate) : json(res, 404, { error: "Candidato no encontrado" });
    }

    const detailMatch = url.pathname.match(/^\/api\/candidates\/([^/]+)$/);
    if (req.method === "GET" && detailMatch) {
      const candidate = getCandidate(detailMatch[1]);
      return candidate ? json(res, 200, candidate) : json(res, 404, { error: "Candidato no encontrado" });
    }

    const analyzeMatch = url.pathname.match(/^\/api\/candidates\/([^/]+)\/analyze$/);
    if (req.method === "POST" && analyzeMatch) {
      const candidate = getCandidate(analyzeMatch[1]);
      if (!candidate) return json(res, 404, { error: "Candidato no encontrado" });
      const config = await readBody(req);
      if (config.provider !== "demo" && !GROQ_CONFIG.apiKey) {
        return json(res, 400, { error: "Configurá GROQ_API_KEY en .env y reiniciá la aplicación." });
      }
      const job = { id: crypto.randomUUID(), events: [], listeners: new Set() };
      jobs.set(job.id, job);
      setImmediate(() => runAnalysis(job, candidate, config));
      return json(res, 202, { jobId: job.id });
    }

    const eventMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)\/events$/);
    if (req.method === "GET" && eventMatch) {
      const job = jobs.get(eventMatch[1]);
      if (!job) return json(res, 404, { error: "Análisis no encontrado" });
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      job.events.forEach((event) => sendEvent(res, event));
      job.listeners.add(res);
      req.on("close", () => job.listeners.delete(res));
      return;
    }

    if (req.method === "GET") return serveStatic(req, res, url.pathname);
    json(res, 404, { error: "Ruta no encontrada" });
  } catch (error) {
    json(res, 500, { error: error.message || "Error interno" });
  }
}

if (require.main === module) {
  http.createServer(handler).listen(PORT, () => {
    console.log(`\nTalent Seeker listo en http://localhost:${PORT}\n`);
  });
}

module.exports = { handler, getCandidate, listCandidates, demoEvaluation, normalizeVerdict, analyzeCandidateDirect, GROQ_CONFIG };
