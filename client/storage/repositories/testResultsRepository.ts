import { getDatabase } from "../database";

export interface TestResult {
  id: string;
  userId: string;
  teethRiskScore: number;
  gumsRiskScore: number;
  overallRiskLevel: string;
  recommendations: string[];
  aiRecommendations: any | null;
  createdAt: string;
}

export interface CreateTestResultInput {
  userId: string;
  teethRiskScore: number;
  gumsRiskScore: number;
  overallRiskLevel: string;
  recommendations?: string[];
  aiRecommendations?: any;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function rowToResult(row: any): TestResult {
  return {
    id: row.id,
    userId: row.user_id,
    teethRiskScore: row.teeth_risk_score,
    gumsRiskScore: row.gums_risk_score,
    overallRiskLevel: row.overall_risk_level,
    recommendations: JSON.parse(row.recommendations || "[]"),
    aiRecommendations: row.ai_recommendations ? JSON.parse(row.ai_recommendations) : null,
    createdAt: row.created_at,
  };
}

export async function createTestResult(input: CreateTestResultInput): Promise<TestResult> {
  const db = await getDatabase();
  const id = generateId();
  
  await db.runAsync(
    `INSERT INTO test_results (id, user_id, teeth_risk_score, gums_risk_score, overall_risk_level, recommendations, ai_recommendations)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.teethRiskScore,
      input.gumsRiskScore,
      input.overallRiskLevel,
      JSON.stringify(input.recommendations || []),
      input.aiRecommendations ? JSON.stringify(input.aiRecommendations) : null,
    ]
  );
  
  const result = await getTestResultById(id);
  if (!result) throw new Error("Failed to create test result");
  return result;
}

export async function getTestResultById(id: string): Promise<TestResult | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM test_results WHERE id = ?`,
    [id]
  );
  
  if (!row) return null;
  return rowToResult(row);
}

export async function getLatestTestResult(userId: string): Promise<TestResult | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM test_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  
  if (!row) return null;
  return rowToResult(row);
}

export async function getAllTestResults(userId: string): Promise<TestResult[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM test_results WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  
  return rows.map(rowToResult);
}

export async function updateAIRecommendations(id: string, aiRecommendations: any): Promise<TestResult | null> {
  const db = await getDatabase();
  
  await db.runAsync(
    `UPDATE test_results SET ai_recommendations = ? WHERE id = ?`,
    [JSON.stringify(aiRecommendations), id]
  );
  
  return await getTestResultById(id);
}

export async function deleteTestResult(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM test_results WHERE id = ?`, [id]);
}
