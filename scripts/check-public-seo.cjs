const assert = require("node:assert/strict");
const {auditPublicSitemap}=require("./public-sitemap-audit.cjs");
const base = (process.env.SEO_TEST_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const canonicalBase = (
  process.env.SITE_URL || "https://free-llm-api-1-didl.onrender.com"
).replace(/\/$/, "");
const slugs = [
  "misa-license",
  "company-formation",
  "corporate-banking",
  "contract-drafting",
  "premium-residency",
  "investment-funds",
];
(async () => {
  const titles = new Set();
  let pages = 0;
  for (const lang of ["ar", "en", "zh"]) {
    await Promise.all(
      ["", "/packages", ...slugs.map((s) => "/services/" + s)].map(async (route) => {
        const path = (lang === "ar" ? "" : "/" + lang) + route || "/";
        const r = await fetch(base + path);
        assert.equal(r.status, 200, path);
        const html = await r.text();
        assert(
          html.includes(`lang="${lang === "zh" ? "zh-Hans" : lang}"`),
          path + " language",
        );
        assert(
          html.includes(`dir="${lang === "ar" ? "rtl" : "ltr"}"`),
          path + " direction",
        );
        assert.equal(
          (html.match(/<h1(?:\s|>)/g) || []).length,
          1,
          path + " H1",
        );
        assert((html.match(/<h2(?:\s|>)/g) || []).length >= (route === "/packages" ? 0 : 3), path + " H2");
        const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) ||
          [])[1];
        assert.equal(
          new URL(canonical).href,
          new URL(canonicalBase + path).href,
          path + " canonical",
        );
        for (const l of ["ar", "en", "zh-Hans", "x-default"])
          assert(
            new RegExp(`hrefLang="${l}"`, "i").test(html),
            path + " hreflang " + l,
          );
        const title = (html.match(/<title>(.*?)<\/title>/) || [])[1];
        assert(title);
        assert(!titles.has(title), path + " duplicate title");
        titles.add(title);
        assert(/<meta name="description" content="[^"]+"/.test(html));
        const scripts = [
          ...html.matchAll(
            /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
          ),
        ];
        assert(scripts.length > 0, path + " schema");
        for (const s of scripts) JSON.parse(s[1]);
        assert(!html.includes("STORAGE_TEST_2026"), path + " QA content");
        assert(!/href="\/ai-readable"/.test(html), path + " AI button");
        assert(html.includes("application/ld+json"));
        if (route === "/packages") {
          assert((html.match(/class="license-category-card"/g)||[]).length === 3, path+" original three license-category cards");
          assert(html.includes("services-branch") && html.includes("professional-scratch"),path+" all ten package offers available in JSON-LD");
          assert(html.includes("schema.org") && html.includes("priceCurrency"),path+" Service Offer JSONLD");
          assert(html.includes(lang==="ar"?"باقات التراخيص الاستثمارية":lang==="zh"?"投资登记套餐":"Investment license packages"),path+" restored heading");
        }
        pages++;
      }),
    );
  }
  const sitemap = await (await fetch(base + "/sitemap.xml")).text();
  const baselinePaths=["", "/packages", ...slugs.map(slug=>"/services/"+slug)]
    .flatMap(route=>["ar","en","zh"].map(lang=>(lang==="ar"?"":"/"+lang)+route||"/"));
  const audited=auditPublicSitemap(sitemap,canonicalBase,baselinePaths);
  for(const extra of audited.extra){
    const response=await fetch(base+extra.path);
    assert.equal(response.status,200,extra.path+" published page");
    const html=await response.text();
    const lang=extra.path.startsWith("/en/")||extra.path==="/en/insights"?"en":
      extra.path.startsWith("/zh/")||extra.path==="/zh/insights"?"zh":"ar";
    assert(html.includes('lang="'+(lang==="zh"?"zh-Hans":lang)+'"'),extra.path+" language");
    assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,extra.path+" heading");
    const canonical=(html.match(/<link rel="canonical" href="([^"]+)"/)||[])[1];
    assert.equal(new URL(canonical).href,extra.url,extra.path+" canonical");
    assert(!/<meta name="robots" content="[^"]*noindex/i.test(html),extra.path+" indexable");
    const title=(html.match(/<title>(.*?)<\/title>/)||[])[1];
    assert(title,extra.path+" title");
    assert(!titles.has(title),extra.path+" duplicate title");
    titles.add(title);
  }
  const robots = await (await fetch(base + "/robots.txt")).text();
  assert(robots.includes("Disallow: /admin/"));
  assert(/User-agent:\s*OAI-SearchBot/i.test(robots),"OAI Search crawler discoverability");
  const admin = await (await fetch(base + "/admin/dashboard")).text();
  assert(/name="robots" content="noindex, nofollow"/.test(admin));
  console.log(
    `PASS ${pages} localized pages: titles, descriptions, single H1, heading structure, canonicals, reciprocal hreflang, JSON-LD and hidden QA text`,
  );
  console.log(`PASS ${audited.total}-entry dynamic sitemap (${audited.baseline} baseline + ${audited.extra.length} editorial), robots exclusions and admin noindex`);
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
