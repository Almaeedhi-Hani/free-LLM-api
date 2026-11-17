/** Observation-only status: no claim that the scheduler ran or Google was queried. */
export function assessGscSyncHealth(capturedAt: string | null | undefined, now: number = Date.now()) {
  if (!capturedAt) return {status:'no_snapshot' as const,age_hours:null};
  const timestamp=Date.parse(capturedAt);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now) || timestamp>now+5*60_000)
    return {status:'invalid_timestamp' as const,age_hours:null};
  const age=(now-timestamp)/3_600_000;
  return {status:age>48?'stale' as const:'recent' as const,age_hours:Math.max(0,Math.round(age*10)/10)};
}

/** Presentation only; a recent stored snapshot does not prove the cron or Google API succeeded. */
export function describeGscSyncStatus(status: unknown) {
  switch (status) {
    case 'recent':
      return { tone: 'recent' as const, label: 'لقطة حديثة', description: 'آخر لقطة محفوظة خلال 48 ساعة. لا يثبت هذا تشغيل الجدولة أو نجاح الاتصال الحالي بـ Google.' };
    case 'stale':
      return { tone: 'stale' as const, label: 'لقطة متأخرة', description: 'مضى أكثر من 48 ساعة منذ آخر لقطة محفوظة. راجع مزامنة GSC وصلاحيات الوصول قبل الاعتماد على حداثة البيانات.' };
    case 'no_snapshot':
      return { tone: 'no_snapshot' as const, label: 'لا توجد لقطة', description: 'لم تُحفظ أي لقطة يومية حتى الآن. لا يمكن الجزم بحالة الاتصال أو التشغيل الدوري.' };
    case 'invalid_timestamp':
      return { tone: 'invalid_timestamp' as const, label: 'توقيت غير صالح', description: 'تاريخ آخر لقطة غير صالح أو في المستقبل؛ لا يمكن حساب حداثة البيانات بأمان.' };
    default:
      return { tone: 'unavailable' as const, label: 'حالة غير متاحة', description: 'لم تُرجع الواجهة البرمجية حالة حداثة قابلة للتفسير. لا تفترض نجاح المزامنة.' };
  }
}
