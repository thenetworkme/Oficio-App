import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB, matches storage.rules
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_PHOTOS_PER_DAY = 8;

export type PhotoValidationError = "too-large" | "wrong-type";

/** Client-side guard mirroring storage.rules, so the user gets instant feedback
 * instead of waiting for a failed upload. */
export function validatePhoto(file: File): PhotoValidationError | null {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return "wrong-type";
  if (file.size > MAX_PHOTO_BYTES) return "too-large";
  return null;
}

/**
 * Uploads one diary photo to `challenge-photos/{uid}/{challengeId}/{dayNumber}/{filename}`
 * and returns its download URL. Call once per file; the caller is
 * responsible for enforcing the 8-photos-per-day cap before calling this.
 */
export async function uploadChallengePhoto(
  uid: string,
  challengeId: string,
  dayNumber: number,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const err = validatePhoto(file);
  if (err) throw new Error(err === "too-large" ? "La foto pesa más de 8 MB." : "Solo se admiten imágenes.");

  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const path = `challenge-photos/${uid}/${challengeId}/${dayNumber}/${safeName}`;
  const storageRef = ref(getFirebaseStorage(), path);

  // uploadBytes doesn't stream progress; we report 0 -> 100 around the single
  // request so callers can still show a per-photo loading state.
  onProgress?.(0);
  await uploadBytes(storageRef, file, { contentType: file.type });
  onProgress?.(100);
  return getDownloadURL(storageRef);
}

/** Deletes a previously-uploaded diary photo by its download URL. Best-effort:
 * swallows "not found" so removing an already-gone photo from the UI doesn't throw. */
export async function deleteChallengePhoto(url: string): Promise<void> {
  try {
    await deleteObject(ref(getFirebaseStorage(), url));
  } catch {
    // Ignore — photo may already be gone, or the URL may be a storage.rules
    // path string rather than a resolvable gs:// ref in some edge cases.
  }
}
