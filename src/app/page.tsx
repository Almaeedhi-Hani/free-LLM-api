import CinematicHero from "@/components/CinematicHero";
import {whatsAppUrlForLanguage} from "@/lib/whatsapp-contacts";
import { pageMetadata } from "@/lib/site-seo";
import { loadHomeModel } from "@/lib/home/model";
import ConversionProof from "@/components/home/ConversionProof";
import AuthorityStrip from "@/components/home/AuthorityStrip";
import MarketEntry from "@/components/home/MarketEntry";
import EditorialPromise from "@/components/home/EditorialPromise";
import FormationPackagesBanner from "@/components/home/FormationPackagesBanner";
import HomeEditorial from "@/components/home/HomeEditorial";
import ServicesSection from "@/components/home/ServicesSection";
import JourneySection from "@/components/home/JourneySection";
import SourcesSection from "@/components/home/SourcesSection";
import ContactSection from "@/components/home/ContactSection";

export const generateMetadata = () => pageMetadata();
export default async function HomePage() {
  const {lang, content, t, serviceList, schema} = await loadHomeModel();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <CinematicHero lang={lang} consultationHref={whatsAppUrlForLanguage(content.contact,lang)} />
      <ConversionProof lang={lang} />
      <AuthorityStrip t={t} />
      <MarketEntry lang={lang} t={t} />
      <EditorialPromise lang={lang} t={t} />
      <FormationPackagesBanner lang={lang} />
      <HomeEditorial lang={lang} content={content} />
      <ServicesSection lang={lang} t={t} serviceList={serviceList} />
      <JourneySection t={t} />
      <SourcesSection lang={lang} t={t} content={content} />
      <ContactSection lang={lang} t={t} content={content} />
    </>
  );
}
