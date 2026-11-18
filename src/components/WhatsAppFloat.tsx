'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {WhatsAppContact,WhatsAppLanguage,whatsAppUrlForLanguage} from '@/lib/whatsapp-contacts';

const labels={
 ar:{button:'تواصل عبر واتساب',choose:'اختر لغة المحادثة',close:'إغلاق قائمة واتساب'},
 en:{button:'WhatsApp chat',choose:'Choose your advisor language',close:'Close WhatsApp options'},
 zh:{button:'WhatsApp 咨询',choose:'选择顾问语言',close:'关闭 WhatsApp 菜单'}
} as const;
const languages=[
 {key:'ar',name:'العربية',subtitle:'Arabic'},
 {key:'en',name:'English',subtitle:'English'},
 {key:'zh',name:'中文',subtitle:'Chinese'}
] as const;

/** All visitors may choose an advisor language; never expose this UI on /admin. */
export function WhatsAppFloat({contact,locale}:{contact:WhatsAppContact;locale:WhatsAppLanguage}){
 const pathname=usePathname()||'/';
 const [open,setOpen]=useState(false);
 const id=useId();
 const wrapper=useRef<HTMLDivElement>(null);
 const options=languages.map(lang=>({...lang,href:whatsAppUrlForLanguage(contact,lang.key)}))
   .filter((lang):lang is typeof lang & {href:string}=>Boolean(lang.href));
 const t=labels[locale];
 useEffect(()=>{
  if(!open)return;
  const handleKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
  const handleOutside=(event:PointerEvent)=>{
   if(wrapper.current&&!wrapper.current.contains(event.target as Node))setOpen(false);
  };
  document.addEventListener('keydown',handleKey);
  document.addEventListener('pointerdown',handleOutside);
  return ()=>{
   document.removeEventListener('keydown',handleKey);
   document.removeEventListener('pointerdown',handleOutside);
  };
 },[open]);
 useEffect(()=>setOpen(false),[pathname]);
 if(pathname==='/admin'||pathname.startsWith('/admin/')||options.length===0)return null;
 return <div ref={wrapper} className="fixed bottom-5 left-4 z-[65] sm:bottom-7 sm:left-7" dir={locale==='ar'?'rtl':'ltr'}>
  {open&&<div id={id} className="absolute bottom-[calc(100%+12px)] left-0 w-[min(88vw,310px)] rounded-2xl border border-[#d8dbc9] bg-[#fffdf7] p-3 shadow-2xl" role="group" aria-label={t.choose}>
   <p className="mb-2 px-1 text-sm font-semibold text-[#183f39]">{t.choose}</p>
   <div className="flex flex-col gap-1">
    {options.map(option=><a key={option.key} lang={option.key}
      href={option.href} target="_blank" rel="noopener noreferrer"
      onClick={()=>setOpen(false)}
      className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#1b443a] transition hover:bg-[#edf5ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1c7651] ${option.key===locale?'bg-[#e7f1e7]':'bg-white'}`}>
      <span>{option.name}</span><span className="text-xs text-[#5e756b]">{option.subtitle}</span>
     </a>)}
   </div>
  </div>}
  <button type="button" aria-controls={id} aria-expanded={open} aria-label={open?t.close:t.button}
   onClick={()=>setOpen(v=>!v)}
   className="inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full border border-[#d8e6cb] bg-[#147d53] px-4 py-3 text-white shadow-xl transition hover:bg-[#106642] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4ab60]">
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
   </svg>
   <span className="hidden text-sm font-semibold sm:inline">{t.button}</span>
   <span className="sr-only">{t.choose}</span>
  </button>
 </div>;
}
