import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  initWebPush,
  isAuthorizedCronRequest,
  sendPushToUser,
} from "@/lib/push-server";
import { isWeekend, responsibleOrder } from "@/lib/utils";
import { Profile } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  const { vapidPublicKey, vapidPrivateKey } = initWebPush();

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { ok: false, error: "VAPID keys missing" },
      { status: 500 }
    );
  }

  // Melbourne time
  const melbourneNow = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Australia/Melbourne",
    })
  );

  if (isWeekend(melbourneNow)) {
    return NextResponse.json({
      ok: true,
      skipped: "weekend",
      melbourneDate: melbourneNow.toISOString(),
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profiles, error } = await adminClient
    .from("profiles")
    .select("id,name,partner_order,couple_id")
    .not("couple_id", "is", null);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  // IMPORTANT:
  // Calculate responsibility using Melbourne date
  const orderToday = responsibleOrder(melbourneNow);

  console.log("Melbourne time:", melbourneNow);
  console.log("Today's order:", orderToday);

  const byCouple = new Map<string, Profile[]>();

  for (const profile of (profiles || []) as Profile[]) {
    if (!profile.couple_id) continue;

    const members = byCouple.get(profile.couple_id) || [];
    members.push(profile);
    byCouple.set(profile.couple_id, members);
  }

  const title = "VerseTogether";

  const message =
    "Good morning! 🌿 Today is your turn to share God's Word with your partner. May He speak through you and bless both of your hearts. ❤️📖";

  const results = [];

for (const [coupleId, members] of Array.from(byCouple.entries())) {
    const responsible = members.find(
      (m) => m.partner_order === orderToday
    );

    if (!responsible) continue;

    console.log("Sending reminder to:", responsible.name);

    const pushResult = await sendPushToUser(
      adminClient,
      responsible.id,
      title,
      message,
      "/add-verse"
    );

    console.log(pushResult);

    if (pushResult.sent > 0) {
      await adminClient.from("morning_reminder_log").insert({
        couple_id: coupleId,
        user_id: responsible.id,
        reminder_date: melbourneNow.toISOString().slice(0, 10),
      });
    }

    results.push({
      coupleId,
      userId: responsible.id,
      partner: responsible.name,
      sent: pushResult.sent,
    });
  }

  return NextResponse.json({
    ok: true,
    melbourneTime: melbourneNow,
    orderToday,
    couplesChecked: byCouple.size,
    notified: results.filter((r) => r.sent > 0).length,
    results,
  });
}