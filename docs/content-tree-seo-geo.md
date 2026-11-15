# Content tree: investor services SEO/GEO roadmap
This graph is the **approved topic taxonomy proposal**, not an inventory of already ranking pages. It anchors OpenCode research and editor decisions.

## Each live commercial page has one job
- Home: sector entry and what we actually provide. Keep existing visual hero and copy unless owner approves a specific edit.
- /services/*: buyer-intent landing pages for six actual service groups. Existing top-level H1 remains authoritative. Add on-page useful H2/H3 sections and evidence-backed links without duplicating the H1.
- /packages: original three-category interactive pricing UI remains unchanged; add only reviewed supporting text, separate professional and official fees.
- /insights: hub for **published and human-reviewed** original guides and factual comparisons. Planned child topics are research candidates and never create 404 links or empty indexable pages.

## OpenCode research and writing contract
1. Read `src/data/content-tree.json` for each GEO run. Identify parent topic and audience, query, language, buyer vs informational intent. Do not assume search volume or rankings from taxonomy.
2. Map observed competitor/authority evidence to an existing `topic_node_id` and existing target route; any new guide needs a unique slug and relevant live parent service.
3. Produce an original language-specific H1 **proposal**, 1-5 H2 sections with possible nested H3 plus real explanatory paragraphs, not just keyword-stuffed outlines. Never change the existing public H1 automatically.
4. Suggest one primary keyword + a small set of supporting variations **from observed queries or conservative research hypotheses**. Flag unknown volume rather than invent it. Check overlap with live pages to prevent cannibalization.
5. Suggest contextual internal links to existing live routes/approved pages with natural-language anchors and a clear parent/child or related-research rationale. Never link to planned, unpublished or missing pages.
6. External links: source citations to trustworthy authority pages actually checked; separate research evidence from manually verified official citations. No fake approvals, reviews or results.
7. Select candidate Schema types grounded in **visible** content (Article for published guides; BreadcrumbList for visible page hierarchy; Service only for actual service offerings). JSON-LD must reflect the rendered page, never invented Organization credentials or unshown FAQ.
8. Store every proposed change as pending with sources and destination; technical tasks require code PR, test, approval. Never publish or alter layout/fees automatically.
9. Measure indexing, organic first place, AI citation, brand recommendation, qualified leads separately. A complete content plan is NOT proof of search ranking.

## Google sources
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- https://developers.google.com/search/docs/essentials
