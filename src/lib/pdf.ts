import { IND } from "./industries";
import { moneyIso } from "./money";
import type { Receipt } from "./store";
import type { Cur } from "./types";

/* Dependency-free single-page PDF invoice (Helvetica, A4). */
export function invoicePdf(r: Receipt, cur: Cur): Blob {
  const I = IND[r.ind];
  const hex = I.color.replace("#", "");
  const acc = [0, 2, 4].map(i => (parseInt(hex.substr(i, 2), 16) / 255).toFixed(3)).join(" ");
  const clean = (s: string) => s.replace(/[·–—]/g, "-").replace(/×/g, "x").replace(/[^\x20-\x7E]/g, "").replace(/([()\\])/g, "\\$1");
  const ops: string[] = [];
  const rect = (x: number, y: number, w: number, h: number, rgb: string) => ops.push(`${rgb} rg ${x} ${y} ${w} ${h} re f`);
  const text = (x: number, y: number, size: number, s: string, bold = false, rgb = "0.08 0.08 0.08") =>
    ops.push(`${rgb} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${clean(s)}) Tj ET`);
  const amount = moneyIso(r.amount, cur);
  const date = new Date(r.date).toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const ink = "0.04 0.04 0.04", grey = "0.45 0.45 0.43";

  rect(0, 742, 595, 100, acc);
  text(48, 792, 30, "INVOICE", true, ink);
  text(48, 768, 11, `${I.biz}  -  ${I.url}`, false, ink);
  text(400, 796, 9, r.mode === "live" ? "PAID" : "SANDBOX / TEST MODE", true, ink);
  text(400, 782, 9, r.mode === "live" ? "" : "No real funds were moved", false, ink);
  const meta: [string, string][] = [
    ["Invoice no.", "INV-" + r.id.slice(3).toUpperCase()],
    ["Receipt", r.id],
    ["Provider ref.", r.providerId ?? "-"],
    ["Date", date],
    ["Gateway", r.gw.replace("ЮKassa", "YooKassa").replace("СБП", "SBP")],
    ["Status", "PAID"]
  ];
  meta.forEach(([k, v], i) => { text(48, 700 - i * 20, 10, k, false, grey); text(160, 700 - i * 20, 10, v, true); });
  text(360, 700, 10, "Billed to", false, grey);
  text(360, 682, 11, "Demo Customer", true);
  text(360, 666, 10, "customer@example.com");
  rect(48, 540, 499, 26, "0.95 0.95 0.93");
  text(60, 549, 9, "DESCRIPTION", true, "0.35 0.35 0.33");
  text(380, 549, 9, "QTY", true, "0.35 0.35 0.33");
  text(460, 549, 9, "AMOUNT", true, "0.35 0.35 0.33");
  text(60, 516, 11, r.item.slice(0, 58));
  text(380, 516, 11, "1");
  text(460, 516, 11, amount);
  ops.push("0.85 0.85 0.82 RG 48 496 m 547 496 l S");
  text(360, 470, 10, "Subtotal", false, grey); text(460, 470, 10, amount);
  text(360, 452, 10, "Tax (0%)", false, grey); text(460, 452, 10, moneyIso(0, cur));
  rect(350, 410, 197, 30, acc);
  text(360, 421, 12, "Total paid", true, ink); text(460, 421, 12, amount, true, ink);
  text(48, 120, 9, "Generated automatically by Chameleon Engine - stored in the orders table, synced to the dashboard.", false, grey);

  const content = ops.join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(n => String(n).padStart(10, "0") + " 00000 n \n").join("");
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
