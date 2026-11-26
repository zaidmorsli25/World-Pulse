import { handler, json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const GET = handler({ auth: true }, async ({ userId }) => json({ entries: await getStore().listLedger(userId!, 50) }));
