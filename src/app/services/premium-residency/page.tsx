import { pageMetadata } from "@/lib/site-seo";
export const generateMetadata = () => pageMetadata("premium-residency");
import { ServicePage } from "@/components/ServicePage";
export default function Page() {
  return <ServicePage slug="premium-residency" />;
}
