"use client";
import {usePathname} from "next/navigation";
import type {ReactNode} from "react";

// All three localized landing pages render this card in the journey instead.
// The other public pages retain their existing footer card.
export default function NonHomeFooterCard({children}:{children:ReactNode}) {
  const path=usePathname();
  if(path===null||/^\/(?:ar|en|zh)?\/?$/.test(path))return null;
  return <>{children}</>;
}
