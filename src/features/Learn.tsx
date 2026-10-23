import { ArrowRight, LockKeyhole, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { copy } from "../lib/copy";
import { useSettings } from "../lib/settings";
export default function Learn() {
  const t = copy(useSettings().language);
  return (
    <Page eyebrow={t.learn} title={t.learnTitle} description={t.learnBody}>
      <div className="learning-path">
        <section className="path-card">
          <div className="path-number">
            <Sprout />
          </div>
          <div>
            <span className="pill">UNIT 0 · {t.preview}</span>
            <h2>{t.unit}</h2>
            <p className="eyebrow">{t.planned}</p>
            <ul className="scope-list">
              {[t.initial, t.tones, t.pairs, t.sandhi].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <Link className="button primary" to="/unit-0">
              {t.try}
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
        <section className="path-card future">
          <div className="path-number">
            <LockKeyhole />
          </div>
          <div>
            <span className="eyebrow">HSK 1 · {t.coming}</span>
            <h2>{t.coming}</h2>
            <p>{t.locked}</p>
          </div>
        </section>
      </div>
    </Page>
  );
}
