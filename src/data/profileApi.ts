import { supabase } from '@data/supabase';
import { runtimeConfig } from '@/config/runtimeConfig';

const SUPABASE_URL = runtimeConfig.supabaseUrl;
const SUPABASE_ANON_KEY = runtimeConfig.supabaseAnonKey;

export interface ProfileUpdatePayload {
  name?: string;
  birthDate?: string | null;
  helpFocus?: string | null;
  datingStartDate?: string | null;
}

type ProfileResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Build snake_case update object from camelCase payload, only including present keys */
function buildUpdateObject(
  payload: ProfileUpdatePayload,
): Record<string, string | null> {
  const update: Record<string, string | null> = {};

  if ('name' in payload) update['name'] = payload.name ?? null;
  if ('birthDate' in payload) update['birth_date'] = payload.birthDate ?? null;
  if ('helpFocus' in payload) update['help_focus'] = payload.helpFocus ?? null;
  if ('datingStartDate' in payload)
    update['dating_start_date'] = payload.datingStartDate ?? null;

  return update;
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

/** Map file extension to MIME content type */
function getContentType(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/** Upload a local image URI to the avatars bucket and update the profile avatar_url. */
export async function uploadAvatar(
  imageUri: string,
): Promise<ProfileResult<string>> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return { ok: false, error: 'Session expired. Please sign in again.' };
    }

    const rawExt = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const ext = ALLOWED_EXTENSIONS.includes(
      rawExt as (typeof ALLOWED_EXTENSIONS)[number],
    )
      ? rawExt
      : 'jpg';
    const contentType = getContentType(ext);
    const path = `${session.user.id}/avatar.${ext}`;

    // React Native's fetch() returns an empty blob for local file:// URIs.
    // Use FormData with the native {uri, type, name} object instead —
    // RN handles this as a proper multipart file upload.
    const formData = new FormData();
    formData.append('file', { uri: imageUri, type: contentType, name: `avatar.${ext}` } as unknown as Blob);

    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/avatars/${path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          'x-upsert': 'true',
          // No Content-Type — let RN set the multipart boundary automatically
        },
        body: formData,
      },
    );

    if (!uploadResponse.ok) {
      return { ok: false, error: 'Failed to upload photo. Please try again.' };
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', session.user.id);

    if (updateError) {
      return { ok: false, error: 'Failed to save photo.' };
    }

    return { ok: true, data: urlData.publicUrl };
  } catch {
    return { ok: false, error: 'Failed to upload photo. Please try again.' };
  }
}

/** Update the authenticated user's profile row in `public.profiles`. */
export async function updateProfile(
  payload: ProfileUpdatePayload,
): Promise<ProfileResult<void>> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return { ok: false, error: 'Session expired. Please sign in again.' };
    }

    const updateObj = buildUpdateObject(payload);

    if (Object.keys(updateObj).length === 0) {
      return { ok: true, data: undefined };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateObj)
      .eq('id', session.user.id);

    if (error) {
      return { ok: false, error: 'Failed to save changes. Please try again.' };
    }

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: 'Failed to save changes. Please try again.' };
  }
}
