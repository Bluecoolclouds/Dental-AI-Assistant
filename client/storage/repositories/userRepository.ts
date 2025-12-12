import { getDatabase } from "../database";
import * as Crypto from "expo-crypto";

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
}

async function hashPassword(password: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
  return hash;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const db = await getDatabase();
  const passwordHash = await hashPassword(input.password);
  const id = generateId();
  
  await db.runAsync(
    `INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`,
    [id, input.email.toLowerCase(), passwordHash]
  );
  
  const user = await db.getFirstAsync<User>(
    `SELECT id, email, created_at as createdAt FROM users WHERE id = ?`,
    [id]
  );
  
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<User>(
    `SELECT id, email, created_at as createdAt FROM users WHERE email = ?`,
    [email.toLowerCase()]
  );
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<User>(
    `SELECT id, email, created_at as createdAt FROM users WHERE id = ?`,
    [id]
  );
}

export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const db = await getDatabase();
  const passwordHash = await hashPassword(password);
  
  const user = await db.getFirstAsync<User>(
    `SELECT id, email, created_at as createdAt FROM users WHERE email = ? AND password_hash = ?`,
    [email.toLowerCase(), passwordHash]
  );
  
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM users WHERE id = ?`, [id]);
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
