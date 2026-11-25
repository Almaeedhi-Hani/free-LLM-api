
import type { HomeModel } from "@/lib/home/model";
import NextStepCard from "@/components/layout/NextStepCard";
import {whatsAppUrlForLanguage} from "@/lib/whatsapp-contacts";

export default function JourneySection({t,lang,content}: Pick<HomeModel, "t" | "lang" | "content">) {
  return (
    <>
      <section id="journey" className="journey-section">
        <div className="section-wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.journey}</p>
              <h2>{t.process}</h2>
            </div>
            <p>{t.processIntro}</p>
          </div>
          <div className="journey-grid">
            {t.stages.map((s, i) => (
              <div key={s}>
                <span className="step-number">0{i + 1}</span>
                <h3>{s}</h3>
                <p>{t.stageText[i]}</p>
              </div>
            ))}
          </div>
          <NextStepCard lang={lang} label={t.contact} whatsappHref={whatsAppUrlForLanguage(content.contact,lang)} />
        </div>
      </section>
    </>
  );
}
