import { pageMetadata } from "@/lib/site-seo";
export const generateMetadata = () => pageMetadata("investment-funds");
import { ServicePage } from "@/components/ServicePage";
export default function Page() {
  return <ServicePage slug="investment-funds" />;
}
