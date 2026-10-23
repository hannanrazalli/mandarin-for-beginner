import { ArrowRight, ChartNoAxesColumnIncreasing, Layers } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Page } from "../components/Page";
import { copy } from "../lib/copy";
import { useSettings } from "../lib/settings";
export default function Empty() {
  const t = copy(useSettings().language);
  const stats = useLocation().pathname === "/statistik";
  const Icon = stats ? ChartNoAxesColumnIncreasing : Layers;
  return (
    <Page
      eyebrow={stats ? t.stats : t.review}
      title={stats ? t.statsTitle : t.reviewTitle}
    >
      <section className="empty-state">
        <span className="empty-art">
          <Icon size={44} strokeWidth={1.4} />
        </span>
        <h2>{stats ? t.statsEmpty : t.reviewEmpty}</h2>
        <p>{stats ? t.statsBody : t.reviewBody}</p>
        <Link className="button primary" to="/unit-0">
          {t.try}
          <ArrowRight size={18} />
        </Link>
      </section>
    </Page>
  );
}
