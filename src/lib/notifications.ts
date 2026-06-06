import { supabase } from "@/lib/supabase";

export async function cleanupVerseNotifications(verseId: string) {
  const { error } = await supabase
    .from("app_notifications")
    .delete()
    .like("link", `%${verseId}%`);

  if (error) {
    throw error;
  }
}
