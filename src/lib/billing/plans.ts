// Plan constants shared between server and client. Keep this module free of
// server-only imports (db, node:crypto, …) so it's safe in client bundles.

/** Slug of the Team product registered with the Dodo checkout plugin. */
export const STROKE_TEAM_SLUG = "stroke-team";
/** Plan identifier stored on team licenses and enterprise_domains rows. */
export const TEAM_PLAN = "team";
/** Price shown in the UI, in whole USD. Keep in sync with the Dodo product. */
export const TEAM_PRICE_USD = 99;
