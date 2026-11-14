import { getLocale } from "@/lib/site-language";
import PackageRequest from "./PackageRequest";
import { pageMetadata } from "@/lib/site-seo";
export const metadata=pageMetadata();
export default function PackagesPage(){return <PackageRequest lang={getLocale()}/>}
