import PackagesLanding from "@/components/PackagesLanding";
import { packageMetadata } from "@/lib/site-seo";
export const dynamic = "force-dynamic";
export const generateMetadata = () => packageMetadata("en");
export default function EnglishPackages() { return <PackagesLanding lang="en"/>; }
