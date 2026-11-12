-- Verifier for Migration 004 (run after apply)
select 'origin_column_present_opportunities' as check, count(*)::text as value from information_schema.columns where table_schema='public' and table_name='opportunities' and column_name='origin';
select 'origin_column_present_goals' as check, count(*)::text as value from information_schema.columns where table_schema='public' and table_name='agent_goals' and column_name='origin';
select 'origin_check_constraint' as check, count(*)::text as value from information_schema.check_constraints where constraint_name like '%origin%';
EOF
echo written