"use client";

import {useEffect, useId, useMemo, useState} from "react";
import {usePathname} from "next/navigation";

type Locale="ar"|"en"|"zh";
type NavKey="home"|"services"|"packages"|"guides"|"journey"|"sources"|"contact";

const labels={
  ar:{
    menu:"قائمة الموقع",open:"فتح القائمة",close:"إغلاق القائمة",
    home:"الرئيسية",services:"الخدمات",packages:"الباقات",guides:"الأدلة",
    journey:"رحلة المستثمر",sources:"المصادر الرسمية",contact:"تواصل معنا",
    consultation:"ناقش مشروعك",languages:"اللغة",caption:"SAUDI ARABIA",
  },
  en:{
    menu:"Site navigation",open:"Open menu",close:"Close menu",
    home:"Home",services:"Services",packages:"Packages",guides:"Guides",
    journey:"Your journey",sources:"Official sources",contact:"Contact",
    consultation:"DISCUSS YOUR PLAN",languages:"Language",caption:"SAUDI ARABIA",
  },
  zh:{
    menu:"网站导航",open:"打开菜单",close:"关闭菜单",
    home:"首页",services:"服务",packages:"套餐",guides:"指南",
    journey:"投资流程",sources:"官方资料",contact:"联系我们",
    consultation:"咨询投资计划",languages:"语言",caption:"SAUDI ARABIA",
  }
} as const;

function pathFor(locale:Locale,path="/"){
  return locale==="ar"?path:`/${locale}${path==="/"?"":path}`;
}
function selectedPage(pathname:string,hash:string):NavKey{
  const localPath=pathname.replace(/^\/(?:ar|en|zh)(?=\/|$)/,"")||"/";
  if(localPath.startsWith("/packages"))return "packages";
  if(localPath.startsWith("/insights")||localPath.startsWith("/guides"))return "guides";
  if(localPath.startsWith("/services"))return "services";
  if(hash==="#services")return "services";
  if(hash==="#journey")return "journey";
  if(hash==="#sources")return "sources";
  if(hash==="#contact")return "contact";
  return "home";
}

/** Client-only mobile presentation. The desktop header and its URLs are unchanged. */
export default function MobileFloatingNav({
  locale,brand,hasGuides
}:{locale:Locale;brand:string;hasGuides:boolean}){
  const pathname=usePathname()||"/";
  const [open,setOpen]=useState(false);
  const [hash,setHash]=useState("");
  const id=useId();
  const t=labels[locale];
  const home=pathFor(locale);
  useEffect(()=>{
    setHash(window.location.hash);
    const updateHash=()=>setHash(window.location.hash);
    window.addEventListener("hashchange",updateHash);
    return ()=>window.removeEventListener("hashchange",updateHash);
  },[pathname]);
  useEffect(()=>{
    if(!open)return;
    const onEscape=(event:KeyboardEvent)=>{
      if(event.key==="Escape")setOpen(false);
    };
    document.addEventListener("keydown",onEscape);
    return ()=>document.removeEventListener("keydown",onEscape);
  },[open]);
  const items=useMemo(()=>[
    {key:"home" as const,label:t.home,href:home},
    {key:"services" as const,label:t.services,href:home+"#services"},
    {key:"packages" as const,label:t.packages,href:pathFor(locale,"/packages")},
    ...(hasGuides?[{key:"guides" as const,label:t.guides,href:pathFor(locale,"/insights")}]:[]),
    {key:"journey" as const,label:t.journey,href:home+"#journey"},
    {key:"sources" as const,label:t.sources,href:home+"#sources"},
    {key:"contact" as const,label:t.contact,href:home+"#contact"},
  ],[locale,hasGuides,home,t]);
  const active=selectedPage(pathname,hash);
  const currentPath=pathname.replace(/^\/(?:ar|en|zh)(?=\/|$)/,"")||"/";
  const langHref=(lang:Locale)=>pathFor(lang,currentPath)+hash;

  return <div className="mobile-floating-nav-shell">
    {open&&<button type="button" className="mobile-floating-menu-backdrop" onClick={()=>setOpen(false)}
      aria-label={t.close} tabIndex={-1}/>}
    <div className="mobile-floating-nav-bar">
      <a className="mobile-floating-wordmark" href={home} onClick={()=>setOpen(false)} aria-label={brand}>
        <span className="mobile-floating-brand-emblem" aria-hidden="true">IS</span>
        <span className="mobile-floating-brand-copy">
          <strong>{brand}</strong>
          <small>{t.caption}</small>
        </span>
      </a>
      <button type="button" className="mobile-floating-menu-toggle"
        aria-label={open?t.close:t.open} aria-expanded={open} aria-controls={id}
        onClick={()=>setOpen(v=>!v)}>
        <span className={open?"mobile-floating-hamburger is-open":"mobile-floating-hamburger"} aria-hidden="true">
          <span/><span/><span/>
        </span>
      </button>
    </div>
    {open&&<nav className="mobile-floating-menu" id={id} aria-label={t.menu}>
      <div className="mobile-floating-menu-links">
        {items.map(item=><a key={item.key} href={item.href} onClick={()=>setOpen(false)}
          aria-current={active===item.key?"page":undefined}
          className={active===item.key?"mobile-floating-menu-link is-active":"mobile-floating-menu-link"}>
          {item.label}
        </a>)}
      </div>
      <a href={home+"#contact"} onClick={()=>setOpen(false)} className="mobile-floating-menu-cta">
        {t.consultation}
      </a>
      <div className="mobile-floating-languages" aria-label={t.languages}>
        {(["ar","en","zh"] as const).map(lang=><a key={lang} lang={lang}
          href={langHref(lang)}
          aria-current={locale===lang?"page":undefined}
          onClick={()=>{document.cookie=`site-language=${lang}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;setOpen(false);}}>
          {lang==="ar"?"العربية":lang==="en"?"English":"中文"}
        </a>)}
      </div>
    </nav>}
  </div>;
}
