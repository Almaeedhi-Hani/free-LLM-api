/** Reversible build-time admin UI flags. No publishing or job controls change. */
export const ADMIN_LEGACY_ARCHIVE_ENABLED =
  process.env.NEXT_PUBLIC_ADMIN_LEGACY_ARCHIVE !== 'false';
export const ADMIN_PUBLISHED_LINKS_ENABLED =
  process.env.NEXT_PUBLIC_ADMIN_PUBLISHED_LINKS !== 'false';
