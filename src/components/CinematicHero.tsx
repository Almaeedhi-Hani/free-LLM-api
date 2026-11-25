import type { Locale } from "@/lib/site-language";

const heroCopy = {
  ar: { eyebrow: "استثمر في المملكة العربية السعودية", title: "استثمر في السعودية.", accent: "بثقة ووضوح.", intro: "بوابتك إلى فرص الأعمال في المملكة العربية السعودية.", primary: "ابدأ الآن", secondary: "استكشف الخدمات" },
  en: { eyebrow: "INVEST IN SAUDI ARABIA", title: "Invest in Saudi.", accent: "With Confidence.", intro: "Your gateway to business opportunities in Saudi Arabia.", primary: "Get Started", secondary: "Explore Services" },
  zh: { eyebrow: "投资沙特阿拉伯", title: "投资沙特阿拉伯，", accent: "清晰规划，自信前行。", intro: "开启您在沙特阿拉伯的商业机遇。", primary: "立即开始", secondary: "探索服务" },
} as const;

/** Homepage-only adaptation of SkyElite; local authorized still, no unverified video. */
export default function CinematicHero({lang}: {lang: Locale}) {
  const h = heroCopy[lang];
  return (
    <section className="cinematic-hero" aria-labelledby="cinematic-title">
      <picture className="cinematic-art" aria-hidden="true">
        <source media="(max-width: 760px)" srcSet="/media/riyadh-monochrome-mobile.webp" />
        <img src="/media/riyadh-monochrome.webp" alt="" width={1600} height={1067} fetchPriority="high" decoding="async" />
      </picture>
      <div className="cinematic-inner">
        <div className="cinematic-copy">
          <p className="cinematic-eyebrow">{h.eyebrow}</p>
          <h1 id="cinematic-title">
            <span className="cinematic-headline">{h.title}</span>{" "}
            <span className="cinematic-accent">{h.accent}</span>
          </h1>
          <p className="cinematic-intro">{h.intro}</p>
          <div className="cinematic-actions">
            <a className="cinematic-secondary" href="#services">{h.secondary}</a>
            <a className="cinematic-primary" href="#contact">{h.primary}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
