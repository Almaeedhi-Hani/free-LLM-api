-- Consent-gated daily aggregate counters, never raw events or visitor identifiers.
CREATE TABLE public.investor_daily_signals (
 day date NOT NULL,
 page text NOT NULL CHECK(page IN ('home','packages','insights','insight','misa-license','company-formation','corporate-banking','contract-drafting','premium-residency','investment-funds')),
 locale text NOT NULL CHECK(locale IN ('ar','en','zh')),
 event text NOT NULL CHECK(event IN ('page_view','whatsapp_click','call_click','packages_open','category_open','offer_choose','request_start','assessment_complete')),
 total bigint NOT NULL CHECK(total>0),
 PRIMARY KEY(day,page,locale,event)
);
ALTER TABLE public.investor_daily_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.investor_daily_signals FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.investor_daily_signals TO service_role;
CREATE FUNCTION public.increment_investor_daily_signal(p_page text,p_locale text,p_event text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 INSERT INTO public.investor_daily_signals(day,page,locale,event,total)
 VALUES ((now() AT TIME ZONE 'Asia/Riyadh')::date,p_page,p_locale,p_event,1)
 ON CONFLICT(day,page,locale,event) DO UPDATE SET total=investor_daily_signals.total+1;
$$;
REVOKE ALL ON FUNCTION public.increment_investor_daily_signal(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.increment_investor_daily_signal(text,text,text) TO service_role;
CREATE FUNCTION public.read_investor_daily_report(p_days integer,p_locale text DEFAULT 'all',p_page text DEFAULT 'all')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE
 last_day date:=(now() AT TIME ZONE 'Asia/Riyadh')::date;
 first_day date;
 payload jsonb;
BEGIN
 IF p_days IS NULL OR p_days NOT IN (7,30,90) OR p_locale IS NULL OR p_locale NOT IN ('all','ar','en','zh') OR p_page IS NULL OR p_page NOT IN ('all','home','packages','insights','insight','misa-license','company-formation','corporate-banking','contract-drafting','premium-residency','investment-funds') THEN
  RAISE EXCEPTION 'invalid investor report filters' USING ERRCODE='22023';
 END IF;
 first_day:=last_day-(p_days-1);
 WITH signal_rows AS (
  SELECT day,page,locale,event,total FROM public.investor_daily_signals
   WHERE day BETWEEN first_day AND last_day AND (p_locale='all' OR locale=p_locale) AND (p_page='all' OR page=p_page)
 ), lead_source AS (
  SELECT (created_at AT TIME ZONE 'Asia/Riyadh')::date AS day,locale,
    CASE WHEN origin_path IS NULL THEN 'packages'
      WHEN regexp_replace(origin_path,'^/(en|zh)(/|$)','/') IN ('/','') THEN 'home'
      WHEN regexp_replace(origin_path,'^/(en|zh)(/|$)','/') ~ '^/packages/?$' THEN 'packages'
      WHEN regexp_replace(origin_path,'^/(en|zh)(/|$)','/') ~ '^/insights/?$' THEN 'insights'
      WHEN regexp_replace(origin_path,'^/(en|zh)(/|$)','/') ~ '^/insights/' THEN 'insight'
      WHEN regexp_replace(origin_path,'^/(en|zh)(/|$)','/') ~ '^/services/(misa-license|company-formation|corporate-banking|contract-drafting|premium-residency|investment-funds)/?$'
       THEN split_part(regexp_replace(origin_path,'^/(en|zh)(/|$)','/'),'/',3)
      ELSE 'unknown' END AS page
   FROM public.package_requests
   WHERE created_at >= (first_day::timestamp AT TIME ZONE 'Asia/Riyadh')
     AND created_at < ((last_day+1)::timestamp AT TIME ZONE 'Asia/Riyadh')
     AND (p_locale='all' OR locale=p_locale)
 ), leads AS (
  SELECT day,page,locale,count(*) AS total FROM lead_source WHERE p_page='all' OR page=p_page GROUP BY day,page,locale
 )
 SELECT jsonb_build_object('from',first_day,'to',last_day,
 'firstRecordedDay',(SELECT min(day) FROM public.investor_daily_signals),
 'signals',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY day,page,locale,event) FROM signal_rows s),'[]'::jsonb),
 'requests',coalesce((SELECT jsonb_agg(to_jsonb(l) ORDER BY day,page,locale) FROM leads l),'[]'::jsonb))
 INTO payload;
 RETURN payload;
END $$;
REVOKE ALL ON FUNCTION public.read_investor_daily_report(integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_investor_daily_report(integer,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
