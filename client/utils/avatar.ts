import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

function getAvatarDir(): string {
  const docDir = (FileSystem as any).documentDirectory || "";
  return `${docDir}avatars/`;
}

async function ensureAvatarDir(dir: string) {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

async function saveImageToLocal(uri: string, userId: string): Promise<string> {
  const dir = getAvatarDir();
  await ensureAvatarDir(dir);
  const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
  const destPath = `${dir}avatar_${userId}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: destPath });
  return destPath;
}

export async function deleteAvatarFile(avatarUrl: string | null): Promise<void> {
  if (!avatarUrl) return;
  try {
    const info = await FileSystem.getInfoAsync(avatarUrl);
    if (info.exists) {
      await FileSystem.deleteAsync(avatarUrl, { idempotent: true });
    }
  } catch {}
}

export async function pickAvatarFromGallery(userId: string): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return await saveImageToLocal(result.assets[0].uri, userId);
}

export async function pickAvatarFromCamera(userId: string): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return await saveImageToLocal(result.assets[0].uri, userId);
}
