const { GROQ_CONFIG } = require("../server");

module.exports = function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  return res.status(200).json({
    groqConfigured: Boolean(GROQ_CONFIG.apiKey),
    model: GROQ_CONFIG.model,
    mode: GROQ_CONFIG.apiKey ? "groq" : "user-token",
  });
};
