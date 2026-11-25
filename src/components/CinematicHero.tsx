import ArrowUpRight from "@/components/ArrowUpRight";
import { localizedPath, type Locale } from "@/lib/site-language";
import { copy } from "@/lib/service-catalog";

const heroCopy = {
  ar: { title: "استثمر في السعودية.", accent: "بثقة ووضوح.", topic: "تأسيس الشركات وخدمات المستثمرين في السعودية", primary: "اطلب استشارة", secondary: "استعرض الباقات" },
  en: { title: "Invest in Saudi Arabia.", accent: "With confidence.", topic: "Company formation & investor services in Saudi Arabia", primary: "Request a Consultation", secondary: "Explore Packages" },
  zh: { title: "投资沙特阿拉伯，", accent: "清晰规划，自信前行。", topic: "沙特公司设立与投资者服务", primary: "预约咨询", secondary: "查看服务套餐" },
} as const;

/** Static server-rendered hero. Reuses the site's original architectural CSS artwork;
 * no external media, remote fonts, client bundle, or video until rights are confirmed. */
export default function CinematicHero({lang}: {lang: Locale}) {
  const t = copy[lang];
  const h = heroCopy[lang];
  return (
    <section className="cinematic-hero" aria-labelledby="cinematic-title">
      <div className="hero-art cinematic-art" aria-hidden="true">
        <div className="art-orbit" />
        <div className="art-sun" />
        <div className="cinematic-distant-city" />
        <div className="tower tower-four" />
        <div className="tower tower-one" />
        <div className="tower tower-two" />
        <div className="tower tower-three" />
        <div className="art-ground" />
      </div>
      <div className="cinematic-scrim" aria-hidden="true" />
      <div className="cinematic-inner">
        <div className="cinematic-copy">
          <p className="eyebrow cinematic-eyebrow"><span aria-hidden="true" />{t.eyebrow}</p>
          <h1 id="cinematic-title">
            <small className="cinematic-topic">{h.topic}</small>
            <span>{h.title}</span>{" "}
            <span className="cinematic-accent">{h.accent}</span>
          </h1>
          <p className="cinematic-intro">{t.intro}</p>
          <div className="cinematic-actions">
            <a className="cinematic-primary" href="#contact">{h.primary}<ArrowUpRight /></a>
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
