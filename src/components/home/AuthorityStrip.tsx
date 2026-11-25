
import type { HomeModel } from "@/lib/home/model";

export default function AuthorityStrip({t}: Pick<HomeModel, "t">) {
  return (
    <>
      <div className="authority-strip">
        <span>{t.sources}</span>
        {["MISA", "Saudi Business Center", "SAMA", "CMA"].map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>
    </>
  );
}
