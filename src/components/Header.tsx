import ProfileAvatar from "./ProfileAvatar";

export default function Header({
  title,
  subtitle,
  avatarUrl,
  avatarName,
}: {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  avatarName?: string | null;
}) {
  const showAvatar = avatarUrl !== undefined || avatarName !== undefined;

  return (
    <header className="mb-6 rounded-[28px] border border-sage-100 bg-white/80 p-4 shadow-[0_16px_28px_-24px_rgba(47,58,38,0.45)] backdrop-blur sm:p-5">
      <div className={showAvatar ? "flex items-start justify-between gap-3" : ""}>
        <div className="min-w-0 flex-1">
          <p className="badge-pill">VerseTogether</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-sage-900 sm:text-[2rem]">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-sage-600 sm:text-base">{subtitle}</p>}
        </div>
        {showAvatar && (
          <ProfileAvatar url={avatarUrl} name={avatarName} size="sm" className="shrink-0" />
        )}
      </div>
    </header>
  );
}
