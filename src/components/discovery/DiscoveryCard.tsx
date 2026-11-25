import PackageArrow from "@/components/packages/PackageArrow";
export type DiscoveryIcon = "services"|"trading"|"professional"|"registration"|"company"|"bank"|"contract"|"residency"|"funds"|"guide"|"comparison";
export function serviceDiscoveryIcon(slug:string):DiscoveryIcon {
  const icons:Record<string,DiscoveryIcon>={"misa-license":"registration","company-formation":"company","corporate-banking":"bank","contract-drafting":"contract","premium-residency":"residency","investment-funds":"funds"};
  return icons[slug]||"guide";
}
function DiscoveryIcon({icon}:{icon:DiscoveryIcon}){
  const paths:Record<DiscoveryIcon,string>={
    services:"M3 7h18v13H3zM8 7V4h8v3M3 12l9 3 9-3M12 13v3",
    trading:"M3 8h18l-2-5H5L3 8ZM4 12v9h16v-9M9 21v-6h6v6M3 8v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V8",
    professional:"M5 21V3h10v18M15 10h4v11M3 21h18M8 7h4M8 11h4M8 15h4",
    registration:"M6 3h12v18H6zM9 7h6M9 11h6m-6 5 2 2 4-4",
    company:"M3 21V9h8v12M11 21V3h10v18M1 21h22M6 12v2M6 17v1M14 7h4M14 11h4M14 15h4",
    bank:"M2 8 12 3l10 5H2ZM3 20h18M5 18v-7M12 18v-7M19 18v-7",
    contract:"M5 3h14v18H5zM8 7h8M8 11h8M8 15h4m2 3 5-5",
    residency:"M3 5h18v14H3zM7 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM6 16c0-3 6-3 6 0M15 9h3M15 13h3",
    funds:"M3 3v18h18M6 16l5-5 4 3 6-8M16 6h5v5",
    guide:"M3 4h6a3 3 0 0 1 3 3v14a5 5 0 0 0-5-3H3V4ZM21 4h-6a3 3 0 0 0-3 3v14a5 5 0 0 1 5-3h4V4Z",
    comparison:"M3 4h7v16H3zM14 4h7v16h-7zM5 9h3M5 13h3M16 9h3M16 13h3"
  };
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[icon]}/></svg>;
}
/** One content pattern for native links and native buttons; no nested controls. */
export function DiscoveryContent({icon,title,description,number,eyebrow,meta,action,heading=false,actionClass=""}:{icon:DiscoveryIcon;title:string;description?:string;number?:number;eyebrow?:string;meta?:string;action:string;heading?:boolean;actionClass?:string}) {
  return <>
    <span className="discovery-top"><span className="discovery-icon"><DiscoveryIcon icon={icon}/></span>{number!==undefined&&<span className="discovery-number" aria-hidden="true">{String(number).padStart(2,"0")}<i/></span>}</span>
    {eyebrow&&<span className="discovery-eyebrow">{eyebrow}</span>}
    {heading?<h3 className="discovery-title">{title}</h3>:<strong className="discovery-title">{title}</strong>}
    {description&&<span className="discovery-description">{description}</span>}
    <span className="discovery-footer">
      {meta&&<span className="discovery-meta">{meta}</span>}
      <span className={"discovery-action "+actionClass}>{action}<span className="discovery-arrow"><PackageArrow direction="forward"/></span></span>
    </span>
  </>;
}
/** Compact contextual navigation; preserves the real href and anchor text. */
export function DiscoveryLink({href,title,icon="guide",description,action}:{href:string;title:string;icon?:DiscoveryIcon;description?:string;action?:string}){
  return <a className="discovery-card discovery-compact" href={href}>
    <span className="discovery-icon"><DiscoveryIcon icon={icon}/></span>
    <span className="discovery-compact-copy"><strong className="discovery-title">{title}</strong>{description&&<span className="discovery-description">{description}</span>}{action&&<span className="discovery-eyebrow">{action}</span>}</span>
    <span className="discovery-arrow"><PackageArrow direction="forward"/></span>
  </a>;
}
