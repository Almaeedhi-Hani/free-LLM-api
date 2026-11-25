import ArrowUpRight from "@/components/ArrowUpRight";
import {whatsAppUrlForLanguage} from "@/lib/whatsapp-contacts";
import type { HomeModel } from "@/lib/home/model";

export default function ContactSection({lang, t, content}: Pick<HomeModel, "lang" | "t" | "content">) {
  return (
    <>
      <section id="contact" className="contact-band">
        <div>
          <p className="eyebrow">{t.contact}</p>
          <h2>{t.reach}</h2>
          <p>{t.reachText}</p>
        </div>
        <div className="contact-actions">
          <a
            className="action-primary"
            href={whatsAppUrlForLanguage(content.contact,lang)||"#contact"}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp <span><ArrowUpRight /></span>
          </a>
          <a href={`tel:${content.contact.phone}`}>
            {t.call} <bdi>{content.contact.phoneDisplay}</bdi>
          </a>
        </div>
      </section>
    </>
  );
}
