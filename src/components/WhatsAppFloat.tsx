'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import type {WhatsAppContact,WhatsAppLanguage} from '@/lib/whatsapp-contacts';
import {whatsAppUrlForLanguage} from '@/lib/whatsapp-contacts';

const labels={
 ar:{button:'تواصل عبر واتساب',heading:'تحدث مع مستشارينا',caption:'اختر المستشار حسب لغة المحادثة',close:'إغلاق قائمة المستشارين',
      openChat:'التواصل مع',foot:'سينقلك الاختيار مباشرة إلى واتساب',eyebrow:'INVESTOR SERVICES',genericTitle:'خدمات المستثمرين'},
 en:{button:'WhatsApp consultation',heading:'Speak to our advisors',caption:'Choose an advisor by spoken language',close:'Close advisor list',
      openChat:'Chat with',foot:'Your conversation opens directly in WhatsApp',eyebrow:'INVESTOR SERVICES',genericTitle:'Investor services'},
 zh:{button:'WhatsApp 咨询',heading:'联系投资顾问',caption:'选择会说您所需语言的顾问',close:'关闭顾问列表',
      openChat:'联系',foot:'点击后直接打开 WhatsApp',eyebrow:'INVESTOR SERVICES',genericTitle:'投资者服务'}
} as const;

const languages=[
 {key:'ar',tag:'AR',fallback:'المستشار العربي',mark:'ع'},
 {key:'en',tag:'EN',fallback:'English advisor',mark:'EN'},
 {key:'zh',tag:'中文',fallback:'中文顾问',mark:'中'}
] as const;
const spoken={
 ar:{ar:'يتحدث العربية',en:'يتحدث الإنجليزية',zh:'يتحدث الصينية'},
 en:{ar:'Speaks Arabic',en:'Speaks English',zh:'Speaks Chinese'},
 zh:{ar:'讲阿拉伯语',en:'讲英语',zh:'讲中文'}
} as const;

/** One floating entry point; named advisors and contact numbers are owned by the admin. */
export function WhatsAppFloat({contact,locale}:{contact:WhatsAppContact;locale:WhatsAppLanguage}){
 const pathname=usePathname()||'/';
 const [open,setOpen]=useState(false);
 const id=useId();
 const wrapper=useRef<HTMLDivElement>(null);
 const t=labels[locale];
 const options=languages.map(lang=>{
  const profile=contact.whatsappAdvisors?.[lang.key];
  const name=profile?.name?.trim()||lang.fallback;
  const title=profile?.title?.trim()||t.genericTitle;
  return {...lang,href:whatsAppUrlForLanguage(contact,lang.key),name,title};
 }).filter(option=>Boolean(option.href));
 useEffect(()=>{
  if(!open)return;
  const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
  const closeOutside=(event:PointerEvent)=>{
   if(wrapper.current&&!wrapper.current.contains(event.target as Node))setOpen(false);
  };
  document.addEventListener('keydown',closeOnEscape);
  document.addEventListener('pointerdown',closeOutside);
  return ()=>{
   document.removeEventListener('keydown',closeOnEscape);
   document.removeEventListener('pointerdown',closeOutside);
  };
 },[open]);
 useEffect(()=>setOpen(false),[pathname]);
 if(pathname==='/admin'||pathname.startsWith('/admin/')||!options.length)return null;
 return <div ref={wrapper} className="fixed bottom-5 left-4 z-[65] sm:bottom-7 sm:left-7" dir={locale==='ar'?'rtl':'ltr'}>
  {open&&<section id={id} aria-label={t.heading}
    className="absolute bottom-[calc(100%+12px)] left-0 flex h-[315px] max-h-[calc(100dvh-112px)] w-[280px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] border border-[#d1d5db] bg-[#f9fafb] shadow-[0_18px_65px_rgba(32,42,54,0.25)]">
    <header className="relative shrink-0 overflow-hidden bg-[#202a36] px-3.5 pb-3 pt-3 text-white">
     <span className="absolute -right-10 -top-16 h-36 w-36 rounded-full border border-[#d1d5db]/25" aria-hidden="true"/>
     <span className="absolute -right-2 -top-14 h-28 w-28 rounded-full border border-[#d1d5db]/20" aria-hidden="true"/>
     <p className="text-[8px] font-bold tracking-[0.15em] text-[#d1d5db]">{t.eyebrow}</p>
     <div className="relative mt-1.5 flex items-start justify-between gap-2">
      <div className="min-w-0">
       <h2 className="text-[14px] font-bold leading-[19px] text-[#f9fafb]">{t.heading}</h2>
       <p className="mt-0.5 text-[10px] leading-[14px] text-[#d1d5db]">{t.caption}</p>
      </div>
      <button type="button" onClick={()=>setOpen(false)} aria-label={t.close}
       className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d1d5db]">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/>
       </svg>
      </button>
     </div>
    </header>
    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]" tabIndex={0} aria-label={t.caption}>
     {options.map(option=><a key={option.key} lang={option.key}
       href={option.href||undefined} target="_blank" rel="noopener noreferrer"
       aria-label={t.openChat+' '+option.name+' — '+spoken[locale][option.key]}
       onClick={()=>setOpen(false)}
       className={`group flex min-h-[62px] min-w-0 items-center gap-2 rounded-xl border px-2 py-2 transition hover:border-[#d1d5db] hover:bg-[#f9fafb] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4b5563] ${option.key===locale?'border-[#d1d5db] bg-[#f9fafb]':'border-[#d1d5db] bg-white'}`}>
       <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#d1d5db] bg-[#f9fafb] text-[11px] font-bold text-[#202a36]" aria-hidden="true">
         {option.name===option.fallback?option.mark:option.name.slice(0,2)}
       </div>
       <div className="min-w-0 flex-1">
         <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 truncate text-[12px] font-bold leading-[16px] text-[#202a36]">{option.name}</span>
          <span className="shrink-0 rounded-full border border-[#d1d5db] bg-[#f9fafb] px-1 py-0.5 text-[8px] leading-none font-bold text-[#4b5563]">{option.tag}</span>
         </div>
         <p className="mt-0.5 truncate text-[10px] leading-[14px] text-[#4b5563]">{option.title}</p>
         <p className="mt-0.5 truncate text-[10px] leading-[14px] font-medium text-[#4b5563]">{spoken[locale][option.key]}</p>
       </div>
       <svg className="h-4 w-4 shrink-0 text-[#4b5563] transition group-hover:-translate-y-0.5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" fill="none" aria-hidden="true">
        <path d="M5 19 19 5M8 5h11v11" strokeLinecap="round" strokeLinejoin="round"/>
       </svg>
      </a>)}
    </div>
    <p className="shrink-0 border-t border-[#d1d5db] bg-[#f9fafb] px-2.5 py-2 text-center text-[9px] leading-[13px] text-[#4b5563]">{t.foot}</p>
   </section>}
  <button type="button" aria-controls={id} aria-expanded={open} aria-label={open?t.close:t.button}
    onClick={()=>setOpen(value=>!value)}
    className="inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full border border-[#d1d5db] bg-[#202a36] px-4 py-3 text-white shadow-[0_8px_25px_rgba(32,42,54,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1a2229] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d1d5db]">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
     <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
    <span className="hidden text-sm font-semibold sm:inline">{t.button}</span>
   </button>
 </div>;
}
