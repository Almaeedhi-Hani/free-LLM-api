import { pageMetadata } from "@/lib/site-seo";
export const generateMetadata = () => pageMetadata("corporate-banking");
import { ServicePage } from "@/components/ServicePage";
export default function Page() {
  return <ServicePage slug="corporate-banking" />;
}
