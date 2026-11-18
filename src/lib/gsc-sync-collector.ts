/** Bounded, loss-aware Search Console pagination; no synthetic page rows. */
export type GscDimension='query'|'page'|'country'|'device'|null;
export type GscRow={keys?:string[];clicks:number;impressions:number;ctr:number;position:number};
export const GSC_PAGE_SIZE=1000;
export const GSC_ROW_CEILING=25000;
export async function collectGscDimensionRows(
 query:(dimension:GscDimension,startRow:number,rowLimit:number)=>Promise<GscRow[]>,
 dimension:GscDimension
):Promise<GscRow[]>{
 const output:GscRow[]=[];
 const expectedKeys=dimension===null?0:1;
 for(let startRow=0;startRow<GSC_ROW_CEILING;startRow+=GSC_PAGE_SIZE){
  const page=await query(dimension,startRow,GSC_PAGE_SIZE);
  if(!Array.isArray(page)||page.length>GSC_PAGE_SIZE)throw Error('gsc_invalid_page');
  for(const row of page){
   if(!row||!Array.isArray(row.keys||[])||(row.keys||[]).length!==expectedKeys||
      (row.keys||[]).some(key=>typeof key!=='string'||!key.trim())||
      !Number.isSafeInteger(row.clicks)||row.clicks<0||
      !Number.isSafeInteger(row.impressions)||row.impressions<0||
      row.clicks>row.impressions||!Number.isFinite(row.position)||row.position<0||
      !Number.isFinite(row.ctr)||row.ctr<0||row.ctr>1)
     throw Error('gsc_invalid_row');
  }
  output.push(...page);
  if(page.length<GSC_PAGE_SIZE)return output;
 }
 // A silently truncated export can never be a claimed complete measurement.
 throw Error('gsc_dimension_exceeds_row_ceiling');
}
