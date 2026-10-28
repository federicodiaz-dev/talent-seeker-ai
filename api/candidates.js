const { listCandidates, getCandidate } = require("../server");

module.exports = function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
    const requestUrl = new URL(req.url || "/api/candidates", "http://localhost");
    const candidateId = requestUrl.searchParams.get("id");
    if (candidateId) {
      const candidate = getCandidate(candidateId);
      return candidate ? res.status(200).json(candidate) : res.status(404).json({ error: "Candidato no encontrado" });
    }
    return res.status(200).json(listCandidates());
  } catch (error) {
    console.error("candidate_api_failed", error?.message);
    return res.status(500).json({ error: "No se pudieron cargar los candidatos" });
  }
};
