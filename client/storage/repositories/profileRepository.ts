import { getDatabase } from "../database";

export interface UserProfile {
  id: string;
  userId: string;
  avatarUrl: string | null;
  displayName: string | null;
  birthDate: string | null;
  gender: string | null;
  goals: string | null;
  location: string | null;
  allergyToAnesthetics: string | null;
  seriousIllnesses: string | null;
  age: number | null;
  brushingFrequency: string | null;
  usesFloss: boolean;
  usesIrrigator: boolean;
  hasBraces: boolean;
  hasSensitivity: boolean;
  hasGumBleeding: boolean;
  hasCrownsVeneers: boolean;
  hasRemovableDentures: boolean;
  hasImplants: boolean;
  onboardingCompleted: boolean;
  disclaimerAccepted: boolean;
  updatedAt: string;
}

export interface CreateProfileInput {
  userId: string;
  avatarUrl?: string;
  displayName?: string;
  birthDate?: string;
  gender?: string;
  goals?: string;
  location?: string;
  allergyToAnesthetics?: string;
  seriousIllnesses?: string;
  age?: number;
  brushingFrequency?: string;
  usesFloss?: boolean;
  usesIrrigator?: boolean;
  hasBraces?: boolean;
  hasSensitivity?: boolean;
  hasGumBleeding?: boolean;
  hasCrownsVeneers?: boolean;
  hasRemovableDentures?: boolean;
  hasImplants?: boolean;
  onboardingCompleted?: boolean;
  disclaimerAccepted?: boolean;
}

function rowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    avatarUrl: row.avatar_url ?? null,
    displayName: row.display_name ?? null,
    birthDate: row.birth_date ?? null,
    gender: row.gender ?? null,
    goals: row.goals ?? null,
    location: row.location ?? null,
    allergyToAnesthetics: row.allergy_to_anesthetics ?? null,
    seriousIllnesses: row.serious_illnesses ?? null,
    age: row.age,
    brushingFrequency: row.brushing_frequency,
    usesFloss: !!row.uses_floss,
    usesIrrigator: !!row.uses_irrigator,
    hasBraces: !!row.has_braces,
    hasSensitivity: !!row.has_sensitivity,
    hasGumBleeding: !!row.has_gum_bleeding,
    hasCrownsVeneers: !!row.has_crowns_veneers,
    hasRemovableDentures: !!row.has_removable_dentures,
    hasImplants: !!row.has_implants,
    onboardingCompleted: !!row.onboarding_completed,
    disclaimerAccepted: !!row.disclaimer_accepted,
    updatedAt: row.updated_at,
  };
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

export async function createProfile(input: CreateProfileInput): Promise<UserProfile> {
  const db = await getDatabase();
  const id = generateId();
  
  await db.runAsync(
    `INSERT INTO user_profiles (id, user_id, display_name, birth_date, gender, goals,
      age, brushing_frequency, uses_floss, uses_irrigator, 
      has_braces, has_sensitivity, has_gum_bleeding, has_crowns_veneers, has_removable_dentures, 
      has_implants, onboarding_completed, disclaimer_accepted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.displayName ?? null,
      input.birthDate ?? null,
      input.gender ?? null,
      input.goals ?? null,
      input.age ?? null,
      input.brushingFrequency ?? null,
      input.usesFloss ? 1 : 0,
      input.usesIrrigator ? 1 : 0,
      input.hasBraces ? 1 : 0,
      input.hasSensitivity ? 1 : 0,
      input.hasGumBleeding ? 1 : 0,
      input.hasCrownsVeneers ? 1 : 0,
      input.hasRemovableDentures ? 1 : 0,
      input.hasImplants ? 1 : 0,
      input.onboardingCompleted ? 1 : 0,
      input.disclaimerAccepted ? 1 : 0,
    ]
  );
  
  const profile = await getProfileByUserId(input.userId);
  if (!profile) throw new Error("Failed to create profile");
  return profile;
}

export async function getProfileByUserId(userId: string): Promise<UserProfile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM user_profiles WHERE user_id = ?`,
    [userId]
  );
  
  if (!row) return null;
  return rowToProfile(row);
}

export async function updateProfile(userId: string, updates: Partial<CreateProfileInput>): Promise<UserProfile | null> {
  const db = await getDatabase();
  
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.avatarUrl !== undefined) {
    setClauses.push("avatar_url = ?");
    values.push(updates.avatarUrl);
  }
  if (updates.displayName !== undefined) {
    setClauses.push("display_name = ?");
    values.push(updates.displayName);
  }
  if (updates.birthDate !== undefined) {
    setClauses.push("birth_date = ?");
    values.push(updates.birthDate);
  }
  if (updates.gender !== undefined) {
    setClauses.push("gender = ?");
    values.push(updates.gender);
  }
  if (updates.goals !== undefined) {
    setClauses.push("goals = ?");
    values.push(updates.goals);
  }
  if (updates.location !== undefined) {
    setClauses.push("location = ?");
    values.push(updates.location);
  }
  if (updates.allergyToAnesthetics !== undefined) {
    setClauses.push("allergy_to_anesthetics = ?");
    values.push(updates.allergyToAnesthetics);
  }
  if (updates.seriousIllnesses !== undefined) {
    setClauses.push("serious_illnesses = ?");
    values.push(updates.seriousIllnesses);
  }
  if (updates.age !== undefined) {
    setClauses.push("age = ?");
    values.push(updates.age);
  }
  if (updates.brushingFrequency !== undefined) {
    setClauses.push("brushing_frequency = ?");
    values.push(updates.brushingFrequency);
  }
  if (updates.usesFloss !== undefined) {
    setClauses.push("uses_floss = ?");
    values.push(updates.usesFloss ? 1 : 0);
  }
  if (updates.usesIrrigator !== undefined) {
    setClauses.push("uses_irrigator = ?");
    values.push(updates.usesIrrigator ? 1 : 0);
  }
  if (updates.hasBraces !== undefined) {
    setClauses.push("has_braces = ?");
    values.push(updates.hasBraces ? 1 : 0);
  }
  if (updates.hasSensitivity !== undefined) {
    setClauses.push("has_sensitivity = ?");
    values.push(updates.hasSensitivity ? 1 : 0);
  }
  if (updates.hasGumBleeding !== undefined) {
    setClauses.push("has_gum_bleeding = ?");
    values.push(updates.hasGumBleeding ? 1 : 0);
  }
  if (updates.hasCrownsVeneers !== undefined) {
    setClauses.push("has_crowns_veneers = ?");
    values.push(updates.hasCrownsVeneers ? 1 : 0);
  }
  if (updates.hasRemovableDentures !== undefined) {
    setClauses.push("has_removable_dentures = ?");
    values.push(updates.hasRemovableDentures ? 1 : 0);
  }
  if (updates.hasImplants !== undefined) {
    setClauses.push("has_implants = ?");
    values.push(updates.hasImplants ? 1 : 0);
  }
  if (updates.onboardingCompleted !== undefined) {
    setClauses.push("onboarding_completed = ?");
    values.push(updates.onboardingCompleted ? 1 : 0);
  }
  if (updates.disclaimerAccepted !== undefined) {
    setClauses.push("disclaimer_accepted = ?");
    values.push(updates.disclaimerAccepted ? 1 : 0);
  }
  
  if (setClauses.length === 0) {
    return await getProfileByUserId(userId);
  }
  
  setClauses.push("updated_at = datetime('now')");
  values.push(userId);
  
  await db.runAsync(
    `UPDATE user_profiles SET ${setClauses.join(", ")} WHERE user_id = ?`,
    values
  );
  
  return await getProfileByUserId(userId);
}

export async function upsertProfile(input: CreateProfileInput): Promise<UserProfile> {
  const existing = await getProfileByUserId(input.userId);
  if (existing) {
    const updated = await updateProfile(input.userId, input);
    return updated!;
  }
  return await createProfile(input);
}

export async function deleteProfile(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM user_profiles WHERE user_id = ?`, [userId]);
}
