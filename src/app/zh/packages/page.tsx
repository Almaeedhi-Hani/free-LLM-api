import PackagesLanding from "@/components/PackagesLanding";
import { packageMetadata } from "@/lib/site-seo";
export const dynamic = "force-dynamic";
export const generateMetadata = () => packageMetadata("zh");
export default function ChinesePackages() { return <PackagesLanding lang="zh"/>; }
