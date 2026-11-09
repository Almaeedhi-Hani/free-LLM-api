// Central contact configuration (can be wired to an Admin Dashboard later).
export const CONTACT = {
  phone: '+966545059528',
  phoneDisplay: '+966 54 505 9528',
  whatsapp: 'https://wa.me/966545059528',
  tel: 'tel:+966545059528',
  // Language-specific speaking agents (extend as needed)
  agents: {
    ar: { name: 'فريق المستشارين (عربي)', phone: '+966545059528' },
    en: { name: 'English-speaking advisor', phone: '+966545059528' },
    zh: { name: '中文顾问', phone: '+966545059528' },
  },
  offices: {
    head: 'Riyadh (King Fahd Road, Al Olaya)',
    branches: ['Jeddah', 'Madinah', 'Dammam'],
  },
} as const;
