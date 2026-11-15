import { getLocale } from "@/lib/site-language";
import { packageMetadata } from "@/lib/site-seo";
import PackagesLanding from "@/components/PackagesLanding";
export const dynamic = "force-dynamic";
export const generateMetadata = () => packageMetadata(getLocale());
export default function PackagesPage() { return <PackagesLanding lang={getLocale()}/>; }
