import { topFiles, fmtFile } from "./catalog.mjs";
import { FAQ } from "./faq.mjs";

// يمكن تبديل النموذج من قائمة نماذج Workers AI في لوحة Cloudflare
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const PRE = `أنت مساعد طالب الهندسة في كلية الهندسة بجامعة مصراتة. الطلاب يكتبون غالباً باللهجة الليبية أو بالعامية أو بأخطاء إملائية، فافهم قصدهم دائماً (أمثلة: نبي/نبغى = أريد، وين نلقى = أين أجد، فاينل = الامتحان النهائي، ميد = الامتحان الجزئي، كيفاش/شن = كيف/ماذا، تو = الآن، علاش = لماذا، نسحب = أنسحب من مقرر، نحذف = أحذف مقرر، سمستر = فصل دراسي). أجب دائماً بالعربية الفصحى السهلة وبإيجاز وبأسلوب ودود، ولا تستخدم كلمات عامية أو ليبية في ردودك. اعتمد فقط على المعلومات التالية. إن لم تجد الإجابة فيها فقل ذلك بوضوح وانصح بمراجعة قسم التسجيل أو اللوائح الرسمية، ولا تخترع معلومات. عند الإشارة إلى ملف اكتب معرّفه هكذا [#714] ليتحول إلى رابط، ولا تذكر معرّفات غير موجودة في القائمة. إن لم توجد ملفات مطابقة فاذكر ذلك واقترح على الطالب تصفح قسم "كل الملفات" في البوابة.`;

let CACHE = null, T = 0;
async function catalog(request, env) {
  if (CACHE && Date.now() - T < 600000) return CACHE;
  try {
    const u = new URL("/catalog.json", request.url);
    const r = env.ASSETS ? await env.ASSETS.fetch(u) : await fetch(u);
    CACHE = (await r.json()).files || [];
    T = Date.now();
  } catch (e) { CACHE = CACHE || []; }
  return CACHE;
}

const json = (o, status = 200) => Response.json(o, { status });

async function onGet(env) {
  return json({ ok: true, ai_bound: !!env.AI, model: MODEL });
}

async function onPost(request, env) {
  if (!env.AI) return json({ error: "لم يُربط Workers AI بالمشروع. أضف Binding باسم AI ثم أعد النشر" }, 500);
  let b;
  try { b = await request.json(); } catch { return json({ error: "طلب غير صالح" }, 400); }

  let prompt;
  if (typeof b.prompt === "string") {
    prompt = b.prompt.slice(0, 6000);
  } else if (Array.isArray(b.history)) {
    const h = b.history.slice(-8).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 500) }));
    const lastUser = [...h].reverse().find(m => m.role === "user");
    if (!lastUser) return json({ error: "لا يوجد سؤال" }, 400);
    const files = topFiles(await catalog(request, env), lastUser.content);
    const convo = h.map(m => (m.role === "user" ? "الطالب: " : "المساعد: ") + m.content).join("\n");
    prompt = `${PRE}\n\nالأسئلة الشائعة واللوائح:\n${FAQ}\n\nملفات المكتبة المطابقة لسؤال الطالب (المعرّف | العنوان | المقرر | القسم | النوع | الدكتور):\n${files.length ? files.map(fmtFile).join("\n") : "(لا توجد ملفات مطابقة)"}\n\nالمحادثة:\n${convo}\n\nأجب عن آخر سؤال للطالب.`;
  } else return json({ error: "طلب غير صالح" }, 400);

  try {
    const r = await env.AI.run(MODEL, { messages: [{ role: "user", content: prompt }], max_tokens: 700 });
    const text = r?.response ?? r?.result?.response ?? r?.choices?.[0]?.message?.content ?? "";
    if (!text) return json({ error: "رد فارغ من النموذج" }, 502);
    return json({ text });
  } catch (e) {
    const m = String((e && e.message) || e).slice(0, 160);
    return json({ error: m }, /limit|quota|neuron|capacity/i.test(m) ? 429 : 502);
  }
}

export async function handleChat(request, env) {
  if (request.method === "GET") return onGet(env);
  if (request.method === "POST") return onPost(request, env);
  return json({ error: "method not allowed" }, 405);
}
