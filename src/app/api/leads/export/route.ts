import { getCurrentUser } from "@/server/auth";
import { json } from "@/server/http";
import { listLeads } from "@/server/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Quote every cell and neutralise spreadsheet formula injection (=, +, -, @).
const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const rows = await listLeads(user.id, { limit: 100_000 });
  const header = ["id", "created_at", "name", "email", "budget_usd", "score", "intent", "status", "source", "industry", "message"];
  const csv = [header.join(","), ...rows.map(l => [l.id, new Date(l.createdAt).toISOString(), l.name, l.email, l.budgetUsd, l.score, l.intent.replace("intent_", ""), l.status, l.source, l.industry, l.message].map(cell).join(","))].join("\r\n");
  return new Response(String.fromCharCode(0xfeff) + csv, { // BOM so Excel opens UTF-8 (Cyrillic, Uzbek) correctly
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store"
    }
  });
}
