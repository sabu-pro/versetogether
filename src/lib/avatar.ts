import { supabase } from "./supabase";

const BUCKET = "profile-photos";
const AVATAR_FILE = "avatar.webp";
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 512;

export function avatarStoragePath(userId: string) {
  return `${userId}/${AVATAR_FILE}`;
}

export function profileInitial(name?: string | null) {
  const trimmed = name?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export async function compressProfilePhoto(file: File): Promise<Blob> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Please choose a JPG, PNG, or WebP image.");
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Image must be under 10 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process this image.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.85);
  });

  if (!blob) {
    throw new Error("Could not compress this image.");
  }

  return blob;
}

async function removeAvatarFiles(userId: string) {
  const folderPath = userId;
  const { data: files } = await supabase.storage.from(BUCKET).list(folderPath);

  if (files?.length) {
    const paths = files.map((file) => `${folderPath}/${file.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }
}

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const compressed = await compressProfilePhoto(file);
  const path = avatarStoragePath(userId);

  await removeAvatarFiles(userId);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    cacheControl: "3600",
    upsert: true,
    contentType: "image/webp",
  });

  if (uploadError) {
    throw new Error(uploadError.message || "Unable to upload profile photo.");
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message || "Unable to save profile photo.");
  }

  return publicUrl;
}

export async function removeProfilePhoto(userId: string, currentUrl?: string | null) {
  await removeAvatarFiles(userId);

  if (currentUrl) {
    try {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = currentUrl.indexOf(marker);
      if (idx !== -1) {
        const objectPath = currentUrl.slice(idx + marker.length).split("?")[0];
        if (objectPath.startsWith(`${userId}/`)) {
          await supabase.storage.from(BUCKET).remove([objectPath]);
        }
      }
    } catch {
      // Folder cleanup above is sufficient.
    }
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);

  if (error) {
    throw new Error(error.message || "Unable to remove profile photo.");
  }
}
