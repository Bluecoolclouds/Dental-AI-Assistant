import * as SecureStore from "expo-secure-store";

const CURRENT_USER_KEY = "current_user_id";
const USER_CREDENTIALS_PREFIX = "user_creds_";

export interface StoredCredentials {
  userId: string;
  email: string;
}

export async function saveCurrentUser(userId: string, email: string): Promise<void> {
  await SecureStore.setItemAsync(CURRENT_USER_KEY, userId);
  await SecureStore.setItemAsync(
    `${USER_CREDENTIALS_PREFIX}${userId}`,
    JSON.stringify({ userId, email })
  );
}

export async function getCurrentUserId(): Promise<string | null> {
  return await SecureStore.getItemAsync(CURRENT_USER_KEY);
}

export async function getCurrentUserCredentials(): Promise<StoredCredentials | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  
  const data = await SecureStore.getItemAsync(`${USER_CREDENTIALS_PREFIX}${userId}`);
  if (!data) return null;
  
  return JSON.parse(data);
}

export async function clearCurrentUser(): Promise<void> {
  const userId = await getCurrentUserId();
  if (userId) {
    await SecureStore.deleteItemAsync(`${USER_CREDENTIALS_PREFIX}${userId}`);
  }
  await SecureStore.deleteItemAsync(CURRENT_USER_KEY);
}

export async function isUserLoggedIn(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return userId !== null;
}
