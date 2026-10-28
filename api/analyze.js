const { getCandidate, analyzeCandidateDirect } = require("../server");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  try {
    const candidate = getCandidate(req.body?.candidateId);
    if (!candidate) return res.status(404).json({ error: "Candidato no encontrado" });
    const result = await analyzeCandidateDirect(candidate, {
      provider: req.body?.provider,
      apiKey: req.body?.apiKey,
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("analysis_failed", error?.message);
    const message = String(error?.message || "No se pudo completar el análisis");
    const exhausted = /quota|rate limit|limit|credit|token|429/i.test(message);
    return res.status(exhausted ? 429 : 500).json({
      error: exhausted
        ? "La key de Groq alcanzó su límite. Pegá otra key en Configuración y volvé a intentar."
        : message,
    });
  }
};
