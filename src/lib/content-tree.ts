import manifest from "@/data/content-tree.json";
export type TopicLocale="ar"|"en"|"zh";
export type TopicNode=typeof manifest.nodes[number];
export const topicNodes:TopicNode[]=manifest.nodes;
export function topicNodeById(id:string):TopicNode|undefined{return topicNodes.find(node=>node.id===id)}
export function siteTopicPath(id:string):string|null{return topicNodeById(id)?.route||null}
export function topicRelatedLiveNodes(id:string):TopicNode[]{
 const node=topicNodeById(id);if(!node)return [];
 const related=[...(node.related_nodes||[]),...(node.parent_id?[node.parent_id]:[])];
 return [...new Set(related)].map(topicNodeById).filter((x):x is TopicNode=>Boolean(x?.route&&x?.id!==id));
}
export function validateContentTree():{nodes:number;live:number;planned:number}{
 const byId=new Map(topicNodes.map(n=>[n.id,n]));
 if(byId.size!==topicNodes.length)throw Error("Duplicate topic IDs");
 for(const node of topicNodes){
  if(node.parent_id&&!byId.has(node.parent_id))throw Error("Orphan topic "+node.id);
  if(node.id===node.parent_id)throw Error("Self parent "+node.id);
  for(const ref of node.related_nodes)if(!byId.has(ref))throw Error("Broken topic reference "+ref);
  for(const lang of ["ar","en","zh"] as const){
    if(!node.primary_keyword[lang]||!node.main_question[lang])throw Error("Missing "+lang+" topic context "+node.id);
  }
  const visited=new Set<string>();let parent=node.parent_id;
  while(parent){if(visited.has(parent)||parent===node.id)throw Error("Topic tree cycle at "+node.id);visited.add(parent);parent=byId.get(parent)?.parent_id||null}
  if(node.route&&!/^\/(?:$|[a-z0-9/\-]+$)/.test(node.route))throw Error("Unexpected live route "+node.id);
 }
 return {nodes:topicNodes.length,live:topicNodes.filter(n=>n.route).length,planned:topicNodes.filter(n=>!n.route).length};
}
export function topicTreeForAgent(){
 validateContentTree();
 return topicNodes.map(n=>({id:n.id,parent:n.parent_id,status:n.route?"live":"planned",live_route:n.route,intent:n.intent,primary_keyword:n.primary_keyword,question:n.main_question,schema_candidates:n.schema_candidates,related:n.related_nodes,official_sources_for_manual_verification:n.official_sources}));
}
