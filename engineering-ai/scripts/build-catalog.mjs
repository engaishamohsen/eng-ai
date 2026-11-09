// يجمع كل ملفات بوابة الهندسة من الصفحات العامة ويحفظها في public/catalog.json
import { writeFileSync } from "node:fs";
import { BASE, parsePage } from "../src/catalog.mjs";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async u => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; EngAssistantBot/1.0)" } });
      if (r.ok) return await r.text();
    } catch {}
    await sleep(1500);
  }
  throw new Error("تعذّر جلب " + u);
};

// نكمل الصفحات حتى تنتهي الملفات الجديدة (لا نعتمد على رقم آخر صفحة)
const map = new Map();
for (let p = 1; p <= 150; p++) {
  const rows = parsePage(await get(BASE + "files.php?page=" + p));
  const fresh = rows.filter(r => !map.has(r[0]));
  fresh.forEach(r => map.set(r[0], r));
  console.log(صفحة ${p}: ${rows.length} ملف (جديد ${fresh.length}));
  if (!fresh.length) break;
  await sleep(300);
}
const files = [...map.values()].sort((a, b) => b[0] - a[0]);
console.log(مجموع الملفات: ${files.length});
if (files.length < 100) { console.error("عدد الملفات قليل جداً، لن يُستبدل الفهرس القديم."); process.exit(1); }
writeFileSync("public/catalog.json", JSON.stringify({ count: files.length, files }));
