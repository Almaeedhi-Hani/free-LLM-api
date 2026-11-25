import {cache} from "react";
import {getContent} from "@/lib/content-store";
/** Request-local server cache; no cross-request staleness. */
export const getPublicContent=cache(getContent);
