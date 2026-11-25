"use client";
export default function CookieSettingsButton({lang}:{lang:"ar"|"en"|"zh"}){
 return <button type="button" className="investor-cookie-settings" onClick={()=>window.dispatchEvent(new Event("site-cookie-settings"))}>{lang==="ar"?"إعدادات الخصوصية":lang==="zh"?"隐私设置":"Privacy settings"}</button>;
}
