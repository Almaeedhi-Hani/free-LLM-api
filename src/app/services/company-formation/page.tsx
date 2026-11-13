import { pageMetadata } from "@/lib/site-seo";
export const generateMetadata = () => pageMetadata("company-formation");
import { ServicePage } from "@/components/ServicePage";
export default function Page() {
  return <ServicePage slug="company-formation" />;
}
