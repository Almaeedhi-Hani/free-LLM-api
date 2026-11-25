export function faqAnchor(question:string):string {
 return 'faq-'+Array.from(question,c=>c.codePointAt(0)!.toString(16)).join('-');
}
export function editorialAnchor(id:string):string {return 'editorial-'+id;}
