import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'healthfirst_profile_avatar_v2';

type StoredAvatar = Readonly<{
  v: 2;
  mime: string;
  data: string;
}>;

/**
 * Display URI for `<Image source={{ uri }} />` (data URL), or null if none saved.
 * Uses AsyncStorage only — no native filesystem module.
 */
export async function getPersistedAvatarUri(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const p = JSON.parse(raw) as Partial<StoredAvatar>;
    if (p.v !== 2 || typeof p.data !== 'string' || typeof p.mime !== 'string') {
      return null;
    }
    return `data:${p.mime};base64,${p.data}`;
  } catch {
    return null;
  }
}

/**
 * Persist a profile photo from picker `includeBase64` output.
 */
export async function persistAvatarFromBase64(
  base64: string,
  mimeType: string,
): Promise<void> {
  const data = base64.replaceAll(/\s/g, '');
  const mime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const payload: StoredAvatar = { v: 2, mime, data };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function clearPersistedAvatar(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
