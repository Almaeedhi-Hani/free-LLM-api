import { pageMetadata } from "@/lib/site-seo";
export const generateMetadata = () => pageMetadata("contract-drafting");
import { ServicePage } from "@/components/ServicePage";
export default function Page() {
  return <ServicePage slug="contract-drafting" />;
}
