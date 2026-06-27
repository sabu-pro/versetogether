import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { initWebPush, isAuthorizedCronRequest, sendPushToUser } from "@/lib/push-server";
import { isWeekend, responsibleOrder } from "@/lib/utils";
import { Profile } from "@/types";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Push delivery is not configured" }, { status: 500 });
  }

  const { vapidPublicKey, vapidPrivateKey } = initWebPush();
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ ok: false, error: "VAPID keys are not configured" }, { status: 500 });
  }

  if (isWeekend()) {
  return NextResponse.json({
    ok: true,
    skipped: "weekend",
    serverDate: new Date().toISOString(),
    notified: 0,
  });
}

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profiles, error } = await adminClient
    .from("profiles")
    .select("id, name, partner_order, couple_id")
    .not("couple_id", "is", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const orderToday = responsibleOrder();
console.log("[morning-reminder] profiles found", profiles?.length);
console.log("[morning-reminder] orderToday", orderToday);
  const byCouple = new Map<string, Profile[]>();

  for (const row of (profiles || []) as Profile[]) {
    if (!row.couple_id) continue;
    const members = byCouple.get(row.couple_id) || [];
    members.push(row);
    byCouple.set(row.couple_id, members);
  }
  console.log("[morning-reminder] couples checked", byCouple.size);

  const title = "VerseTogether";
  const message =  "Good morning! Today is your turn to share God's Word with your partner. May it encourage both of your hearts. ❤️📖";
  const results: { coupleId: string; userId: string; sent: number }[] = [];

  for (const [coupleId, members] of Array.from(byCouple.entries())) {
    const responsible = members.find((member) => member.partner_order === orderToday);
    if (!responsible) continue;
    console.log("[morning-reminder] sending to", {
  coupleId,
  userId: responsible.id,
  name: responsible.name,
});

    const pushResult = await sendPushToUser(
      adminClient,
      responsible.id,
      title,
      message,
      "/add-verse"
    );
    console.log("[morning-reminder] pushResult", pushResult);

    results.push({ coupleId, userId: responsible.id, sent: pushResult.sent });
  }

  const notified = results.filter((item) => item.sent > 0).length;

  return NextResponse.json({
  ok: true,
  orderToday,
  profilesFound: profiles?.length,
  couplesChecked: byCouple.size,
  notified,
  results,
});
}
