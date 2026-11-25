'use strict';
const LANGS=['ar','en','zh'];
const TOPICS=['services','packages','faq','insights','updates'];
const PATHS=['/llms.txt','/llms-full.txt','/api/llm-version',...LANGS.map(l=>'/llms/'+l+'.txt'),...TOPICS.map(t=>'/llms/'+t+'.txt')];
const INDEX_LINKS=['## Direct text feeds (choose only the relevant scope)','',...PATHS.filter(p=>p!=='/llms.txt').map(p=>'- '+p),''];
module.exports={LANGS,TOPICS,PATHS,INDEX_LINKS};
