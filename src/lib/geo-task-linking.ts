/** Explicit GitHub closing reference, never a coincidental PR-number mention. */
export function prClosesIssue(body:unknown,issueNumber:number):boolean{
 if(typeof body!=='string'||body.length>100000||
    !Number.isSafeInteger(issueNumber)||issueNumber<1)return false;
 const closing=/(?:^|[\s(])(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\s+#([1-9]\d*)\b/gi;
 let match:RegExpExecArray|null;
 while((match=closing.exec(body))!==null){
  if(Number(match[1])===issueNumber)return true;
 }
 return false;
}
