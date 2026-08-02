import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { LOGO } from "./logo";
import { FPS, font } from "./theme";
import { Bar, Beat, Bubble, Caption, Counter, Panel, Phone, S, Tile, Typed, Window, at } from "./scenes";

/**
 * The product, demonstrated — a minute flat.
 *
 * Sixteen beats under four seconds each. Nothing was cut to reach it: the
 * timings inside every beat scale with the beat, so each still opens, plays and
 * resolves, only quickly. A held second was the thing removed, not a step.
 *
 * Three minutes following one operator through a working session: they look at
 * the business, find the customers who are slipping, write a message against a
 * real product, send it, get a reply, answer it knowing who is asking, then set
 * the whole thing to run itself and ask the assistant to check the numbers.
 *
 * Sixteen beats of roughly twelve seconds. Each holds long enough to be read,
 * and pushes in slowly while it holds, so nothing is static without a cut.
 */

const B = 112; // beat length — under four seconds, so sixteen fit a minute
const beat = (i: number) => [i * B, (i + 1) * B] as const;

export const DURATION = 16 * B; // 1,792 frames — 60 seconds at 30fps

// ---------------------------------------------------------------------------

function Open() {
  return (
    <Beat range={beat(0)} zoom={0.02}>
      {(l) => (
        <div style={{ textAlign: "center" }}>
          <img
            src={LOGO}
            alt=""
            style={{
              width: 132,
              height: 132,
              objectFit: "contain",
              opacity: at(l, 4, 12),
              transform: `scale(${0.9 + at(l, 4, 12) * 0.1})`,
            }}
          />
          <div style={{ marginTop: 34, fontSize: 80, fontWeight: 800, letterSpacing: "-0.04em", opacity: at(l, 7, 18) }}>
            PulseCommerce
          </div>
          <div style={{ marginTop: 16, fontSize: 30, color: S.dim, opacity: at(l, 13, 25) }}>
            Analytics and WhatsApp for WooCommerce
          </div>
          <div style={{ marginTop: 46, fontSize: 24, color: S.dim, opacity: at(l, 34, 45) }}>
            Everything that follows is one session with the product.
          </div>
        </div>
      )}
    </Beat>
  );
}

/** The headline numbers, counting up. */
function Dashboard() {
  return (
    <Beat range={beat(1)}>
      {(l) => (
        <>
          <Window title="Dashboard">
            <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
              <Tile label="Net revenue" local={l} delay={5}>
                <Counter to={7070000} local={l} start={8} span={31} prefix="₹" size={44} />
              </Tile>
              <Tile label="Orders" local={l} delay={9}>
                <Counter to={20444} local={l} start={12} span={31} size={44} />
              </Tile>
              <Tile label="Customers" local={l} delay={12}>
                <Counter to={11224} local={l} start={15} span={31} size={44} />
              </Tile>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <Tile label="Average order value" local={l} delay={16}>
                <Counter to={434} local={l} start={19} span={27} prefix="₹" size={44} />
              </Tile>
              <Tile label="Repeat rate" local={l} delay={20}>
                <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.04em" }}>
                  {Math.round(at(l, 23, 50) * 24)}%
                </span>
              </Tile>
              <Tile label="One-time buyers" local={l} delay={24}>
                <Counter to={8551} local={l} start={27} span={27} size={44} />
              </Tile>
            </div>
          </Window>
          <Caption text="Every figure derived from one cached pull of your order history." local={l} delay={63} />
        </>
      )}
    </Beat>
  );
}

/** Ten RFM segments, drawn as they are scored. */
function Segments() {
  const rows: [string, number, string][] = [
    ["Champions", 0.95, S.accent],
    ["Loyal", 0.78, S.accent],
    ["Potential Loyalist", 0.62, S.accentSoft],
    ["At Risk", 0.5, S.warn],
    ["Cannot Lose Them", 0.36, S.warn],
    ["Hibernating", 0.26, S.dim],
  ];
  return (
    <Beat range={beat(2)}>
      {(l) => (
        <>
          <Window title="Customers · RFM segmentation">
            {rows.map(([label, v, colour], i) => (
              <Bar key={label} label={label} value={v} colour={colour} local={l} delay={6 + i * 6} />
            ))}
          </Window>
          <Caption text="Ten segments and five value tiers, scored on your own customer base." local={l} delay={60} />
        </>
      )}
    </Beat>
  );
}

/** The cohort triangle filling in, month by month. */
function Cohorts() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return (
    <Beat range={beat(3)}>
      {(l) => (
        <>
          <Window title="Cohorts & retention">
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {months.map((m, r) => (
                <div key={m} style={{ display: "flex", gap: 7, alignItems: "center" }}>
                  <span style={{ width: 62, fontSize: 18, color: S.dim }}>{m}</span>
                  {months.map((_, c) => {
                    if (c > months.length - 1 - r) return <span key={c} style={{ flex: 1 }} />;
                    const e = at(l, 6 + (r * 6 + c) * 2, 14 + (r * 6 + c) * 2);
                    const strength = Math.max(0.12, 0.85 - c * 0.13);
                    return (
                      <span
                        key={c}
                        style={{
                          flex: 1,
                          height: 46,
                          borderRadius: 8,
                          background: S.accent,
                          opacity: e * strength,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </Window>
          <Caption text="Retention by cohort — unelapsed months stay blank, never zero." local={l} delay={66} />
        </>
      )}
    </Beat>
  );
}

/** Which products carry the revenue. */
function Products() {
  const rows: [string, number, string][] = [
    ["Manjistha Soap · A", 0.95, S.accent],
    ["Goat Milk Soap · A", 0.66, S.accent],
    ["Rose Clay Powder · B", 0.44, S.accentSoft],
    ["Avarampoo Soap · B", 0.3, S.accentSoft],
    ["Herbal Shampoo · C", 0.14, S.dim],
  ];
  return (
    <Beat range={beat(4)}>
      {(l) => (
        <>
          <Window title="Products · ABC classification">
            {rows.map(([label, v, colour], i) => (
              <Bar key={label} label={label} value={v} colour={colour} local={l} delay={6 + i * 7} />
            ))}
            <Panel local={l} delay={48}>
              <span style={{ fontSize: 21, color: S.dim }}>
                One product carries <b style={{ color: S.text }}>a third</b> of all revenue.
              </span>
            </Panel>
          </Window>
          <Caption text="A-class products, slow movers, and what refunds are costing you." local={l} delay={63} />
        </>
      )}
    </Beat>
  );
}

/** Stock about to run out, ordered by the revenue behind it. */
function Inventory() {
  const rows: [string, string, string][] = [
    ["Manjistha Soap", "6 days of cover", S.warn],
    ["Goat Milk Soap", "9 days of cover", S.warn],
    ["Rose Clay Powder", "12 days of cover", S.good],
  ];
  return (
    <Beat range={beat(5)}>
      {(l) => (
        <>
          <Window title="Inventory · restock planning">
            {rows.map(([name, cover, colour], i) => (
              <div key={name} style={{ marginBottom: 12 }}>
                <Panel local={l} delay={6 + i * 8}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: colour }} />
                    <b style={{ flex: 1, fontSize: 23 }}>{name}</b>
                    <span style={{ fontSize: 20, color: S.dim }}>{cover}</span>
                  </div>
                </Panel>
              </div>
            ))}
            <Panel local={l} delay={37}>
              <span style={{ fontSize: 21, color: S.dim }}>
                Revenue at risk: <b style={{ color: S.text }}>₹4.2L</b> · suggested order quantities included
              </span>
            </Panel>
          </Window>
          <Caption text="Days of cover from real velocity, not a guess at a reorder point." local={l} delay={63} />
        </>
      )}
    </Beat>
  );
}

/** Filters narrow the base to the people worth messaging. */
function Audience() {
  const filters = ["At risk", "Ordered before", "Has WhatsApp"];
  return (
    <Beat range={beat(6)}>
      {(l) => {
        const n = Math.round(interpolate(at(l, 22, 50), [0, 1], [11224, 214]));
        return (
          <>
            <Window title="Campaigns · build an audience">
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {filters.map((f, i) => {
                  const on = at(l, 9 + i * 8, 16 + i * 8);
                  return (
                    <span
                      key={f}
                      style={{
                        fontSize: 19,
                        fontWeight: 600,
                        padding: "11px 18px",
                        borderRadius: 999,
                        background: on > 0.5 ? S.accent : S.chip,
                        color: on > 0.5 ? "#fff" : S.dim,
                        border: `1px solid ${S.edge}`,
                        opacity: at(l, 6 + i * 8, 12 + i * 8),
                      }}
                    >
                      {f}
                    </span>
                  );
                })}
              </div>
              <Panel local={l} delay={26} pad={24}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                  <span style={{ fontSize: 68, fontWeight: 800, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
                    {n.toLocaleString("en-IN")}
                  </span>
                  <span style={{ fontSize: 23, color: S.dim }}>reachable on WhatsApp</span>
                </div>
              </Panel>
            </Window>
            <Caption text="Filter to the customers who are quietly slipping away." local={l} delay={63} />
          </>
        );
      }}
    </Beat>
  );
}

/** The message writes itself and picks up a real product. */
function Compose() {
  return (
    <Beat range={beat(7)}>
      {(l) => (
        <>
          <Window title="Compose">
            <Panel local={l} delay={4} pad={22}>
              <div style={{ minHeight: 108 }}>
                <Typed
                  text="Hi Priya, your Rose Clay is running low. Reorder here:"
                  local={l}
                  start={8}
                  span={53}
                  size={26}
                />
              </div>
            </Panel>
            <div style={{ height: 14 }} />
            <Panel local={l} delay={63}>
              <div style={{ display: "flex", alignItems: "center", gap: 17 }}>
                <div style={{ width: 58, height: 58, borderRadius: 11, background: S.edge }} />
                <div>
                  <b style={{ display: "block", fontSize: 23 }}>Rose Clay Powder</b>
                  <span style={{ fontSize: 18, color: S.dim }}>photo and buy link, from your catalogue</span>
                </div>
              </div>
            </Panel>
          </Window>
          <Caption text="Ten templates, personalised from each customer's own history." local={l} delay={72} />
        </>
      )}
    </Beat>
  );
}

/** The dry run: resolve the list, send nothing. */
function DryRun() {
  return (
    <Beat range={beat(8)}>
      {(l) => (
        <>
          <Window title="Dry run · nothing is sent">
            <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
              <Tile label="In audience" local={l} delay={5}>
                <Counter to={214} local={l} start={8} span={19} size={40} />
              </Tile>
              <Tile label="Reachable" local={l} delay={9}>
                <Counter to={198} local={l} start={12} span={19} size={40} />
              </Tile>
              <Tile label="Excluded" local={l} delay={12}>
                <Counter to={16} local={l} start={15} span={19} size={40} />
              </Tile>
            </div>
            <Panel local={l} delay={29}>
              <span style={{ fontSize: 20, color: S.dim, lineHeight: 1.6 }}>
                11 no phone number · 3 unreadable · 2 opted out
                <br />
                Every exclusion counted, so &ldquo;sent 198 of 214&rdquo; always has an explanation.
              </span>
            </Panel>
          </Window>
          <Caption text="See exactly who it reaches before a single message goes out." local={l} delay={63} />
        </>
      )}
    </Beat>
  );
}

/** The send, landing on a phone. */
function Send() {
  return (
    <Beat range={beat(9)}>
      {(l) => {
        const p = at(l, 8, 54);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 52 }}>
            <Window title="Sending" width={520}>
              <div style={{ fontSize: 25, marginBottom: 17, color: S.dim }}>
                Sending to {Math.round(p * 198)} of 198
              </div>
              <div style={{ height: 13, borderRadius: 999, background: S.chip }}>
                <div style={{ height: 13, width: `${p * 100}%`, borderRadius: 999, background: S.accent }} />
              </div>
              <div style={{ marginTop: 19, fontSize: 19, color: S.dim, lineHeight: 1.6 }}>
                Paced deliberately · opt-outs excluded
                <br />
                Resumable — closing the page pauses it, it does not break it
              </div>
            </Window>
            <Phone>
              <Bubble side="out" show={at(l, 56, 65)}>
                Hi Priya, your Rose Clay is running low. Reorder here: your-store.com/rose-clay
              </Bubble>
            </Phone>
          </div>
        );
      }}
    </Beat>
  );
}

/** The customer replies. */
function Reply() {
  return (
    <Beat range={beat(10)}>
      {(l) => {
        const typing = at(l, 10, 16) - at(l, 38, 43);
        const r = at(l, 43, 53);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 52 }}>
            <Phone>
              <Bubble side="out" show={1}>
                Hi Priya, your Rose Clay is running low. Reorder here:
              </Bubble>
              {typing > 0.05 ? (
                <div
                  style={{
                    alignSelf: "flex-start",
                    padding: "15px 19px",
                    borderRadius: 18,
                    background: S.chip,
                    opacity: typing,
                    display: "flex",
                    gap: 7,
                  }}
                >
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: S.dim,
                        opacity: 0.35 + 0.65 * Math.abs(Math.sin((l - d * 4) / 6)),
                      }}
                    />
                  ))}
                </div>
              ) : null}
              <Bubble side="in" show={r}>
                Yes please — can you send two?
              </Bubble>
            </Phone>
            <div style={{ maxWidth: 420 }}>
              <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", opacity: r }}>
                They reply.
              </div>
              <div style={{ marginTop: 16, fontSize: 26, color: S.dim, opacity: at(l, 51, 61) }}>
                And it comes back to you, not into a void.
              </div>
            </div>
          </div>
        );
      }}
    </Beat>
  );
}

/** The reply, beside who the customer is. */
function Inbox() {
  return (
    <Beat range={beat(11)}>
      {(l) => (
        <>
          <Window title="Inbox">
            <Panel local={l} delay={6} pad={18}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: S.edge }} />
                <div style={{ flex: 1 }}>
                  <b style={{ display: "block", fontSize: 23 }}>Priya R.</b>
                  <span style={{ fontSize: 19, color: S.dim }}>&ldquo;Yes please — can you send two?&rdquo;</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <b style={{ display: "block", fontSize: 21 }}>11 orders</b>
                  <span style={{ fontSize: 18, color: S.dim }}>₹18,400 lifetime</span>
                </div>
              </div>
            </Panel>
            <div style={{ height: 12 }} />
            <Panel local={l} delay={19}>
              <span style={{ fontSize: 20, color: S.dim }}>
                Champion · last ordered 41 days ago · reachable · never opted out
              </span>
            </Panel>
          </Window>
          <Caption text="Answering is different when you know they have ordered eleven times." local={l} delay={63} />
        </>
      )}
    </Beat>
  );
}

/** The sequence that runs itself. */
function Flows() {
  const steps: [string, string][] = [
    ["DAY 0", "Reminder naming their product"],
    ["DAY 3", "A code, expiring in a fortnight"],
    ["DAY 10", "Last note before it lapses"],
  ];
  return (
    <Beat range={beat(12)}>
      {(l) => {
        const ordered = at(l, 63, 74);
        return (
          <>
            <Window title="Flows · automated sequences">
              <div style={{ display: "flex", gap: 14 }}>
                {steps.map(([day, text], i) => {
                  const e = at(l, 7 + i * 9, 17 + i * 9);
                  const away = i > 0 ? ordered : 0;
                  return (
                    <div
                      key={day}
                      style={{
                        flex: 1,
                        padding: 22,
                        borderRadius: 14,
                        background: S.chip,
                        border: `1px solid ${S.edge}`,
                        opacity: e * (1 - away * 0.72),
                        transform: `translateY(${(1 - e) * 20 + away * 22}px)`,
                      }}
                    >
                      <u style={{ textDecoration: "none", display: "block", fontSize: 21, fontWeight: 800, color: S.accentSoft, marginBottom: 8 }}>
                        {day}
                      </u>
                      <span style={{ fontSize: 19, color: S.dim }}>{text}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ height: 16 }} />
              <Panel local={l} delay={43}>
                <span style={{ fontSize: 20, color: S.dim }}>
                  Customers join as they qualify · nobody enters twice · they leave the moment they buy
                </span>
              </Panel>
            </Window>
            <div
              style={{
                marginTop: 24,
                fontSize: 34,
                fontWeight: 800,
                color: S.accentSoft,
                opacity: ordered,
              }}
            >
              They order on day 4 — the rest never send.
            </div>
          </>
        );
      }}
    </Beat>
  );
}

/** The bot that answers when nobody is at a desk. */
function Menu() {
  return (
    <Beat range={beat(13)}>
      {(l) => (
        <div style={{ display: "flex", alignItems: "center", gap: 52 }}>
          <Window title="Auto-reply · menu builder" width={500}>
            <Panel local={l} delay={5}>
              <span style={{ fontSize: 20, color: S.dim }}>Trigger word</span>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>&ldquo;hi&rdquo;</div>
            </Panel>
            <div style={{ height: 12 }} />
            {["1 · Order", "2 · Contact us", "3 · Feedback"].map((o, i) => (
              <div key={o} style={{ marginBottom: 10 }}>
                <Panel local={l} delay={14 + i * 7} pad={16}>
                  <span style={{ fontSize: 21 }}>{o}</span>
                </Panel>
              </div>
            ))}
          </Window>

          <Phone>
            <Bubble side="in" show={at(l, 38, 47)}>hi</Bubble>
            <Bubble side="out" show={at(l, 50, 60)}>
              Hello! Reply with a number:
              <br />
              <br />
              1 Order
              <br />
              2 Contact us
              <br />
              3 Feedback
            </Bubble>
            <Bubble side="in" show={at(l, 67, 76)}>1</Bubble>
            <Bubble side="out" show={at(l, 72, 82)}>
              Browse and order here → your-store.com/shop
            </Bubble>
          </Phone>
        </div>
      )}
    </Beat>
  );
}

/** The assistant answers, and proposes. */
function Assistant() {
  return (
    <Beat range={beat(14)}>
      {(l) => (
        <>
          <Window title="Assistant">
            <Panel local={l} delay={4} pad={20}>
              <span style={{ fontSize: 21, color: S.dim }}>You</span>
              <div style={{ marginTop: 6 }}>
                <Typed text="How did revenue do this month against last?" local={l} start={7} span={31} size={25} />
              </div>
            </Panel>
            <div style={{ height: 12 }} />
            <Panel local={l} delay={42} pad={20}>
              <span style={{ fontSize: 21, color: S.dim }}>Assistant</span>
              <div style={{ marginTop: 6 }}>
                <Typed
                  text="Net revenue is ₹6.38L this month, about 6% below last month's ₹6.79L."
                  local={l}
                  start={45}
                  span={38}
                  size={25}
                />
              </div>
            </Panel>
            <div style={{ height: 12 }} />
            <div
              style={{
                padding: 20,
                borderRadius: 14,
                background: S.accent,
                opacity: at(l, 77, 87),
                transform: `translateY(${(1 - at(l, 89, 100)) * 16}px)`,
              }}
            >
              <b style={{ display: "block", fontSize: 23, marginBottom: 5 }}>
                Proposal · send a win-back to 198 customers
              </b>
              <span style={{ fontSize: 19, color: "rgba(255,255,255,.86)" }}>
                Approve · Reject — nothing sends until you choose
              </span>
            </div>
          </Window>
          <Caption text="It proposes. You approve. It cannot message an audience on its own." local={l} delay={94} />
        </>
      )}
    </Beat>
  );
}

function Close() {
  return (
    <Beat range={beat(15)} zoom={0.02}>
      {(l) => (
        <div style={{ textAlign: "center" }}>
          <img src={LOGO} alt="" style={{ width: 104, height: 104, objectFit: "contain", opacity: at(l, 4, 12) }} />
          <div style={{ marginTop: 30, fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em", opacity: at(l, 6, 17) }}>
            Analytics and WhatsApp,
            <br />
            in one place
          </div>
          <div style={{ marginTop: 26, fontSize: 24, color: S.dim, opacity: at(l, 19, 32), lineHeight: 1.6 }}>
            Self-hosted · your data never reaches a messaging platform
            <br />
            Your own WhatsApp API · no per-message fee
          </div>
          <div style={{ marginTop: 30, fontSize: 34, fontWeight: 800, color: S.accentSoft, opacity: at(l, 36, 48) }}>
            setups.works
          </div>
        </div>
      )}
    </Beat>
  );
}

/**
 * What each beat is about, said once at the top.
 *
 * Kept as a table rather than a prop on every scene: the film's running order
 * is then one thing to read, and a beat cannot end up unlabelled by omission.
 */
const HEADINGS: [string, string][] = [
  ["PulseCommerce", "Analytics and WhatsApp for WooCommerce"],
  ["Dashboard", "Every figure from one cached pull of your order history"],
  ["Customer segments", "Ten RFM segments, scored on your own base"],
  ["Cohorts & retention", "Who came back, month by month"],
  ["Products", "What carries the revenue, and what does not"],
  ["Inventory", "Days of cover, and the revenue behind each"],
  ["Build an audience", "Filter to the customers who are slipping away"],
  ["Compose", "Personalised from each customer's own history"],
  ["Dry run", "See exactly who it reaches — nothing is sent"],
  ["Send", "Paced, resumable, opt-outs excluded"],
  ["They reply", "And it comes back to you, not into a void"],
  ["Shared inbox", "The reply, beside who the customer is"],
  ["Automated flows", "A sequence that runs itself over days"],
  ["Auto-reply", "Answering when nobody is at a desk"],
  ["The assistant", "It proposes. You approve."],
  ["Setups Works", "setups.works"],
];

/**
 * The heading, and the mark.
 *
 * The mark is white on transparent, so on a white page it is inverted to read
 * as a dark logo rather than needing a coloured tile behind it.
 */
function Chrome() {
  const frame = useCurrentFrame();
  const i = Math.min(HEADINGS.length - 1, Math.floor(frame / B));
  const local = frame - i * B;
  const [title, desc] = HEADINGS[i];
  const e = at(local, 2, 16);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 88,
          top: 66,
          maxWidth: 700,
          opacity: e,
          transform: `translateY(${(1 - e) * 10}px)`,
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", color: S.text }}>
          {title}
        </div>
        <div style={{ marginTop: 6, fontSize: 21, color: S.dim }}>{desc}</div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 88,
          top: 62,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: 0.9,
        }}
      >
        <img
          src={LOGO}
          alt=""
          style={{ width: 44, height: 44, objectFit: "contain", filter: "invert(1)" }}
        />
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: S.text,
          }}
        >
          Setups Works
        </span>
      </div>
    </AbsoluteFill>
  );
}

/** A steady line, so a held beat reads as deliberate rather than stalled. */
function Progress() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 88, right: 88, bottom: 52 }}>
        <div style={{ height: 2, background: S.edge }}>
          <div style={{ height: 2, width: `${(frame / DURATION) * 100}%`, background: S.accent }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ background: S.bg, fontFamily: font }}>
    <Open />
    <Dashboard />
    <Segments />
    <Cohorts />
    <Products />
    <Inventory />
    <Audience />
    <Compose />
    <DryRun />
    <Send />
    <Reply />
    <Inbox />
    <Flows />
    <Menu />
    <Assistant />
    <Close />
    <Chrome />
    <Progress />
  </AbsoluteFill>
);

export const promoConfig = { fps: FPS, durationInFrames: DURATION };
