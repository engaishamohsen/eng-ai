// قراءة صفحات files.php في بوابة الهندسة والبحث في الفهرس
export const BASE = "https://unigov.misuratau.edu.ly/su/";
const TYPES = ["أسئلة سابقة","الشيتات والملخصات","المفردات","الشروحات","مراجع إضافية"];
const DEPTS = ["الهندسة الكهربائية والإلكترونية","الهندسة الصناعية والتصنيع","هندسة العمارة والتخطيط العمراني","الهندسة الميكانيكية","هندسة الذكاء الاصطناعي","هندسة وعلوم المواد","الهندسة البحرية","الهندسة الكيميائية","الهندسة المدنية","هندسة النفط","العام"];

const decode = s => s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ");

export function maxPage(html){
  let m = 1;
  for (const x of html.matchAll(/files\.php\?[^"'\s]*page=(\d+)/g)) m = Math.max(m, +x[1]);
  return m;
}

// يعيد صفوفاً بالشكل: [id, العنوان, المقرر, القسم, النوع, الدكتور]
export function parsePage(html){
  const ids = [...new Set([...html.matchAll(/view_file\.php\?id=(\d+)/g)].map(m => +m[1]))];
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");
  const lines = decode(body.replace(/<[^>]+>/g, "\n")).split("\n").map(s => s.replace(/\s+/g," ").trim()).filter(Boolean);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/\d{4}-\d{2}-\d{2}/.test(lines[i])) continue;
    const t = TYPES.find(x => lines[i].includes(x)) || TYPES.find(x => (lines[i-1]||"").includes(x));
    if (!t || !lines[i+1]) continue;
    let dept = "", doc = "";
    for (let j = i + 3; j <= i + 12 && j < lines.length; j++) {
      if (!dept) { const d = DEPTS.find(x => lines[j].startsWith(x)); if (d) { dept = d; continue; } }
      if (!doc && /^(أ\.|د\.|م\.)/.test(lines[j])) doc = lines[j];
    }
    rows.push([0, lines[i+1], lines[i+2] || "", dept, t, doc]);
  }
  rows.forEach((r, k) => { r[0] = ids[k] || 0; });
  return rows.filter(r => r[0]);
}

export const nz = s => s.replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/ـ/g,"").replace(/[\u064B-\u0652]/g,"");
const STOP = new Set("نبي نبغى نبغي ابي ابغى اريد وين نلقى نلقي لقى عندك عندكم شيت شيتات ملخص ملخصات مذكره ممكن لو سمحت من في على ملف ملفات اعطني هات هاتلي شي شن ابحث عن لي لنا هل ما كيف كيفاش وش ايش هو هي مع الى الي امتحان امتحانات اسئله".split(" "));
const SYN = { "فاينل":"نهائي", "ميد":"جزئي", "ميدترم":"جزئي", "ماث":"رياضه", "فيزيا":"فيزياء" };
const HINTS = [
  [/امتحان|فاينل|نهائي|جزئي|ميد|اسئله|اختبار/, "أسئلة سابقة"],
  [/شيت|ملخص|مذكره/, "الشيتات والملخصات"],
  [/شرح|محاضر/, "الشروحات"],
  [/مفردات|توصيف/, "المفردات"],
];

export function topFiles(files, q, n = 12){
  const raw = nz(q);
  const hint = (HINTS.find(([re]) => re.test(raw)) || [])[1];
  const tk = raw.split(/[\s،,؟?!.]+/).filter(w => (w.length > 1 || /\d/.test(w)) && !STOP.has(w))
    .map(w => SYN[w] || w).map(w => w.length > 4 ? w.replace(/^ال/, "") : w);
  const scored = [];
  for (const f of files) {
    const h = nz(f.slice(1).join(" "));
    const hits = tk.filter(w => h.includes(w)).length;
    if (tk.length && !hits) continue;
    if (!tk.length && !hint) continue;
    scored.push([hits * 10 + (hint && f[4] === hint ? 3 : 0), f]);
  }
  scored.sort((a, b) => b[0] - a[0] || b[1][0] - a[1][0]);
  return scored.slice(0, n).map(x => x[1]);
}
export const fmtFile = f => `[#${f[0]}] ${f[1]} | ${f[2]} | ${f[3]} | ${f[4]} | ${f[5]}`;
