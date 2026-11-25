"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
type Item={key:string;href:string;label:string};
export default function DesktopNavigation({items,label}:{items:Item[];label:string}){
  const pathname=usePathname()||"/";
  const [hash,setHash]=useState("");
  useEffect(()=>{
    const sync=()=>setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange",sync);
    return ()=>window.removeEventListener("hashchange",sync);
  },[pathname]);
  const path=pathname.replace(/^\/(?:ar|en|zh)(?=\/|$)/,"").replace(/\/$/,"")||"/";
  const active=path.startsWith("/packages")?"packages":
    path==="/services/premium-residency"?"residency":
    path.startsWith("/services")?"services":
    path.startsWith("/insights")||path.startsWith("/guides")?"guides":
    path==="/"?hash.slice(1):"";
  return <nav className="desktop-nav" aria-label={label}>
    {items.map(item=><a key={item.key} href={item.href}
      aria-current={active===item.key?(path==="/"?"location":"page"):undefined}>{item.label}</a>)}
  </nav>;
}
