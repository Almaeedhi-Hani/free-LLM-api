import ArrowUpRight from "@/components/ArrowUpRight";
import { localizedPath, type Locale } from "@/lib/site-language";
import { copy } from "@/lib/service-catalog";

const heroCopy = {
  ar: { title: "استثمر في السعودية.", accent: "بثقة ووضوح.", topic: "تأسيس الشركات وخدمات المستثمرين في السعودية", primary: "اطلب استشارة", secondary: "استعرض الباقات" },
  en: { title: "Invest in Saudi Arabia.", accent: "With confidence.", topic: "Company formation & investor services in Saudi Arabia", primary: "Request a Consultation", secondary: "Explore Packages" },
  zh: { title: "投资沙特阿拉伯，", accent: "清晰规划，自信前行。", topic: "沙特公司设立与投资者服务", primary: "预约咨询", secondary: "查看服务套餐" },
} as const;

/** Monochrome editorial hero; real Riyadh architecture, locally hosted responsive poster. */
export default function CinematicHero({lang, consultationHref}: {lang: Locale; consultationHref: string | null}) {
  const t = copy[lang];
  const h = heroCopy[lang];
  return (
    <section className="cinematic-hero" aria-labelledby="cinematic-title">
      <picture className="cinematic-art" aria-hidden="true">
        <source media="(max-width: 760px)" srcSet="/media/riyadh-monochrome-mobile.webp" />
        <img src="/media/riyadh-monochrome.webp" alt="" width={1600} height={1067} fetchPriority="high" decoding="async" />
      </picture>
      <div className="cinematic-scrim" aria-hidden="true" />
      <div className="cinematic-inner">
        <div className="cinematic-copy">
          <p className="eyebrow cinematic-eyebrow"><span aria-hidden="true" />{t.eyebrow}</p>
          <h1 id="cinematic-title">
            <small className="cinematic-topic">{h.topic}</small>
            <span className="cinematic-headline">{h.title}</span>{" "}
            <span className="cinematic-accent">{h.accent}</span>
          </h1>
          <p className="cinematic-intro">{t.intro}</p>
          <div className="cinematic-actions">
            <a className="cinematic-primary" href={consultationHref || "#contact"} target={consultationHref ? "_blank" : undefined} rel={consultationHref ? "noopener noreferrer" : undefined}>{h.primary}<ArrowUpRight /></a>
            <a className="cinematic-secondary" href={localizedPath(lang, "/packages")}>{h.secondary}<ArrowUpRight /></a>
          </div>
        </div>
        <div className="cinematic-footer">
          <a href="#services" className="cinematic-discover">{t.explore}<span aria-hidden="true">↓</span></a>
          <span className="cinematic-tagline">{t.tagline}</span>
        </div>
      </div>
    </section>
  );
}
