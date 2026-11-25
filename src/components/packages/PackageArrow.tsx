/** Plain line arrow, never rendered as a platform-dependent emoji. */
export default function PackageArrow({direction}:{direction:"back"|"forward"}) {
  return <svg className="package-arrow" data-direction={direction} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>;
}
