const test = require("node:test");
const assert = require("node:assert/strict");
const { listCandidates, getCandidate, demoEvaluation, normalizeVerdict, analyzeCandidateDirect } = require("../server");

test("discovers candidate folders and ignores templates", () => {
  const candidates = listCandidates();
  assert.ok(candidates.length >= 10);
  assert.ok(candidates.every((candidate) => !candidate.id.startsWith("_")));
});

test("loads the interviews for a candidate", () => {
  const candidate = getCandidate("tech_lead");
  assert.equal(candidate.name, "Tech Lead");
  assert.equal(candidate.interviews.length, 3);
  assert.ok(candidate.interviews.some((interview) => interview.available));
});

test("demo analysis returns a browser-ready result", () => {
  const result = demoEvaluation("theory", getCandidate("tech_lead"));
  assert.equal(typeof result.score, "number");
  assert.ok(result.title);
  assert.ok(Array.isArray(result.highlights));
});

test("loads rich metadata for sample candidates", () => {
  const candidate = getCandidate("sofia_martinez");
  assert.equal(candidate.role, "Senior AI Engineer");
  assert.equal(candidate.available, 3);
  assert.ok(candidate.tags.includes("LangGraph"));
});

test("always exposes an explicit recruiting verdict", () => {
  assert.equal(normalizeVerdict({ score: 82 }).decision, "CONTINUE");
  assert.equal(normalizeVerdict({ score: 58 }).decision, "HUMAN_REVIEW");
  assert.equal(normalizeVerdict({ score: 31 }).decision, "REJECT");
  assert.ok(normalizeVerdict({ score: 82 }).verdict);
  assert.ok(normalizeVerdict({ score: 82 }).nextStep);
});

test("serverless analysis returns a complete result without filesystem state", async () => {
  const result = await analyzeCandidateDirect(getCandidate("lucas_fernandez"), { provider: "demo" });
  assert.equal(result.provider, "demo");
  assert.ok(result.evaluations.summary.decision);
  assert.ok(result.evaluations.code);
});
