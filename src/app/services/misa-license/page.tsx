import { pageMetadata } from "@/lib/site-seo";
export const generateMetadata = () => pageMetadata("misa-license");
import { ServicePage } from "@/components/ServicePage";
export default function Page() {
  return <ServicePage slug="misa-license" />;
}
