// يجمع كل ملفات بوابة الهندسة من الصفحات العامة ويحفظها في catalog.json
import { writeFileSync } from "node:fs";
import { BASE, parsePage, maxPage } from "../src/catalog.mjs";

const get = async u => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; EngAssistantBot/1.0)" } });
      if (r.ok) return await r.text();
    } catch {}
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error("تعذّر جلب " + u);
};

const first = await get(BASE + "files.php?page=1");
const n = maxPage(first);
let all = parsePage(first);
for (let p = 2; p <= n; p++) {
  all.push(...parsePage(await get(BASE + "files.php?page=" + p)));
  await new Promise(r => setTimeout(r, 300));
}
const map = new Map(all.map(r => [r[0], r]));
const files = [...map.values()].sort((a, b) => b[0] - a[0]);
console.log(`صفحات: ${n} | ملفات: ${files.length}`);
if (files.length < 100) { console.error("عدد الملفات قليل جداً، لن يُستبدل الفهرس القديم."); process.exit(1); }
writeFileSync("public/catalog.json", JSON.stringify({ count: files.length, files }));
