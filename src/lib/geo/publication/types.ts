export type Policy={enabled:boolean;daily_limit:number;allow_high_risk:boolean};
export type AutoPublishReport={
 status:'disabled'|'dry_run'|'completed'|'storage_unavailable'|'error';
 examined:number;published:number;skipped:number;
 events:Array<{item_id:string;result:string;target_path?:string}>;
 message:string;
};
