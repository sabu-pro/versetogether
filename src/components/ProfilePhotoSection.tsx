"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import { useAuth } from "@/lib/auth";
import { removeProfilePhoto, uploadProfilePhoto } from "@/lib/avatar";

export default function ProfilePhotoSection() {
  const { profile, refreshProfile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayUrl = previewUrl ?? profile?.avatar_url ?? null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setBusy(true);
    setError("");

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const publicUrl = await uploadProfilePhoto(profile.id, file);
      setPreviewUrl(publicUrl);
      await refreshProfile();
    } catch (uploadError) {
      setPreviewUrl(profile.avatar_url ?? null);
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload photo.");
    } finally {
      URL.revokeObjectURL(localPreview);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!profile) return;

    const confirmed = window.confirm("Remove your profile photo?");
    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      await removeProfilePhoto(profile.id, profile.avatar_url);
      setPreviewUrl(null);
      await refreshProfile();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mb-5">
      <p className="badge-pill">Profile photo</p>
      <h2 className="mt-3 text-xl font-bold text-sage-900">Your picture</h2>
      <p className="mt-1 text-sm text-sage-600">JPG, PNG, or WebP. Shown on your dashboard.</p>

      <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <ProfileAvatar url={displayUrl} name={profile?.name} size="md" />
        <div className="flex w-full flex-col gap-3 sm:flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={busy || !profile}
            onClick={() => inputRef.current?.click()}
          >
            <Camera size={16} />
            {busy ? "Uploading..." : profile?.avatar_url || previewUrl ? "Replace photo" : "Upload photo"}
          </button>
          {(profile?.avatar_url || previewUrl) && (
            <button
              type="button"
              className="btn btn-secondary w-full"
              disabled={busy || !profile}
              onClick={handleRemove}
            >
              <Trash2 size={16} />
              Remove photo
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </section>
  );
}
