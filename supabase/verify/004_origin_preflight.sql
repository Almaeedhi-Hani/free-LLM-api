-- Preflight for Migration 004
select 'opportunities_exists' as check, count(*)::text as value from information_schema.tables where table_schema='public' and table_name='opportunities';
select 'agent_goals_exists' as check, count(*)::text as value from information_schema.tables where table_schema='public' and table_name='agent_goals';
select 'origin_column_absent_opportunities' as check, count(*)::text as value from information_schema.columns where table_schema='public' and table_name='opportunities' and column_name='origin';
select 'origin_column_absent_goals' as check, count(*)::text as value from information_schema.columns where table_schema='public' and table_name='agent_goals' and column_name='origin';
EOF