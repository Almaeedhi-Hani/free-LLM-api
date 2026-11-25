export type Tab =
  | 'home'
  | 'contact'
  | 'package_requests'
  | 'content'
  | 'agent'
  | 'reviews'
  | 'editorial'
  | 'impact'
  | 'published_links'
  | 'settings'
  | 'competitors'
  | 'keywords'
  | 'opportunities'
  | 'goals'
  | 'runs'
  | 'evidence'
  | 'visibility'
  | 'cookies'
  | 'integrations';

export const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'الرئيسية', icon: '📊' },
  { key: 'competitors', label: 'المنافسون', icon: '🏢' },
  { key: 'keywords', label: 'كلمات البحث السوقية', icon: '🔑' },
  { key: 'opportunities', label: 'الفرص', icon: '🎯' },
  { key: 'goals', label: 'الأهداف', icon: '✅' },
  { key: 'agent', label: 'وكيل GEO', icon: '🤖' },

  { key: 'runs', label: 'سجل التشغيل', icon: '📜' },
  { key: 'evidence', label: 'الأدلة ومصادر النتائج', icon: '🔍' },
  { key: 'content', label: 'محتوى الموقع', icon: '📝' },
  { key: 'reviews', label: 'اعتماد المسودات', icon: '🔍' },
  { key: 'editorial', label: 'تطوير جميع صفحات الموقع', icon: '📚' },
  { key: 'impact', label: 'مركز المحتوى والأثر', icon: '📊' },
  { key: 'published_links', label: 'المحتوى المنشور: الروابط', icon: '🔗' },
  { key: 'contact', label: 'التواصل', icon: '📞' },
  { key: 'package_requests', label: 'طلبات الباقات', icon: '📥' },
  { key: 'visibility', label: 'SEO وظهور الذكاء الاصطناعي', icon: '📈' },
  { key: 'cookies', label: 'إدارة الكوكيز', icon: '🍪' },
  { key: 'integrations', label: 'SEO والتكاملات', icon: '🔗' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
];

export type AdminHub='overview'|'market'|'strategy'|'contentHub'|'measurement'|'customers'|'operations';
/** Seven visible top-level destinations, preserving every existing editable
 * screen as a subordinate tab. No records or API endpoints are deleted. */
export const NAV_HUBS:{key:AdminHub;label:string;icon:string;landing:Tab;tabs:Tab[]}[]=[
  {key:'overview',label:'الرئيسية',icon:'📊',landing:'home',tabs:['home']},
  {key:'market',label:'السوق والمنافسون',icon:'🏢',landing:'competitors',tabs:['competitors','keywords','evidence']},
  {key:'strategy',label:'الفرص وخطة العمل',icon:'🎯',landing:'opportunities',tabs:['opportunities','goals']},
  {key:'contentHub',label:'المحتوى والنشر',icon:'📝',landing:'impact',tabs:['impact','editorial','reviews','content','published_links']},
  {key:'measurement',label:'القياس والظهور',icon:'📈',landing:'visibility',tabs:['visibility']},
  {key:'customers',label:'طلبات العملاء',icon:'👥',landing:'package_requests',tabs:['package_requests']},
  {key:'operations',label:'التشغيل والإعدادات',icon:'⚙️',landing:'agent',tabs:['agent','runs','settings','contact','cookies','integrations']}
];
