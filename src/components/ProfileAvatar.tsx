import { profileInitial } from "@/lib/avatar";

type ProfileAvatarProps = {
  url?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-10 w-10 text-sm",
  md: "h-24 w-24 text-2xl",
  lg: "h-32 w-32 text-3xl",
};

export default function ProfileAvatar({
  url,
  name,
  size = "sm",
  className = "",
}: ProfileAvatarProps) {
  const initial = profileInitial(name);
  const sizeClass = sizeClasses[size];

  if (url) {
    return (
      <img
        src={url}
        alt={name ? `${name}'s profile photo` : "Profile photo"}
        className={`rounded-full border border-rose-100 bg-white object-cover shadow-sm ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full border border-rose-100 bg-gradient-to-br from-[#f8e1eb] to-[#f3d7e4] font-semibold text-sage-900 shadow-sm ${sizeClass} ${className}`}
      aria-hidden={!name}
    >
      {initial}
    </div>
  );
}
