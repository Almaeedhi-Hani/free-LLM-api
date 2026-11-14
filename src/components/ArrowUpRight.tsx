import type { SVGProps } from "react";

/** Consistent vector icon for directional links; inherits the text color. */
export default function ArrowUpRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "inline-block", verticalAlign: "-0.15em", flexShrink: 0 }}
      {...props}
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}
