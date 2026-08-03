import * as React from "react";
import { Check } from "lucide-react";
import { NeoBadge, NeoCard } from "@/components/neo";

/**
 * The building blocks every marketing page shares.
 *
 * Illustrations are drawn from these primitives rather than being screenshots.
 * Two reasons: a scaled capture is unreadable at phone width, and a screenshot
 * goes stale the moment the interface moves, while a drawing made of the same
 * borders and shadows stays on-brand for as long as the brand does.
 */

/**
 * Words on one side, a working-looking thing on the other.
 *
 * Rows alternate sides on desktop and stack in reading order on mobile — copy
 * always first, so the point arrives before the illustration.
 */
export function FeatureRow({
  eyebrow,
  title,
  body,
  points,
  children,
  flip,
  tint,
  id,
}: {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  children: React.ReactNode;
  flip?: boolean;
  tint: string;
  id?: string;
}) {
  return (
    <div id={id} className="grid scroll-mt-28 items-center gap-8 lg:grid-cols-2 lg:gap-12">
      <div className={flip ? "lg:order-2" : ""}>
        <NeoBadge tint={tint}>{eyebrow}</NeoBadge>
        <h3 className="mt-5 text-3xl font-extrabold tracking-tighter sm:text-4xl">{title}</h3>
        <p className="mt-4 text-lg leading-relaxed font-medium text-black/75">{body}</p>
        <ul className="mt-6 space-y-3 text-base font-bold sm:text-lg">
          {points.map((point) => (
            <li key={point} className="flex gap-3">
              <Check className="mt-1 size-5 shrink-0" strokeWidth={3} />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className={flip ? "lg:order-1" : ""}>{children}</div>
    </div>
  );
}

/** A dashboard, drawn rather than captured. */
export function DashboardMock() {
  const tiles: [string, string, string][] = [
    ["Net revenue", "₹7.07L", "bg-[#ffd93d]"],
    ["Orders", "20,444", "bg-[#7bdc9b]"],
    ["Customers", "11,224", "bg-[#ff8fab]"],
    ["Repeat rate", "24%", "bg-white"],
  ];

  return (
    <NeoCard className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-extrabold tracking-tight">Dashboard</span>
        <span className="text-sm font-bold text-black/60">Last 12 months</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map(([label, value, tint]) => (
          <div
            key={label}
            className={`rounded-lg border-[3px] border-black p-3 shadow-[4px_4px_0_0_#000] ${tint}`}
          >
            <p className="text-xs font-bold text-black/60">{label}</p>
            <p className="text-2xl font-extrabold tracking-tighter">{value}</p>
          </div>
        ))}
      </div>

      {/* Bars rather than a line: a line needs a path, and this needs none. */}
      <div className="flex h-24 items-end gap-1.5 rounded-lg border-[3px] border-black bg-white p-2">
        {[38, 52, 44, 63, 58, 71, 66, 82, 74, 90, 85, 96].map((height, i) => (
          <span key={i} className="flex-1 rounded-sm bg-[#2f66e8]" style={{ height: `${height}%` }} />
        ))}
      </div>
    </NeoCard>
  );
}

/** Segment bars, as the customers screen draws them. */
export function SegmentMock() {
  const rows: [string, number, string][] = [
    ["Champions", 95, "bg-[#2f66e8]"],
    ["Loyal", 74, "bg-[#7bdc9b]"],
    ["At risk", 52, "bg-[#ffd93d]"],
    ["Hibernating", 31, "bg-[#ff8fab]"],
    ["Lost", 18, "bg-[#ff6b5a]"],
  ];

  return (
    <NeoCard className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-extrabold tracking-tight">Customer segments</span>
        <span className="text-sm font-bold text-black/60">RFM</span>
      </div>
      {rows.map(([label, width, colour]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-sm font-bold sm:w-32 sm:text-base">{label}</span>
          <span
            className={`h-7 rounded-md border-[3px] border-black ${colour}`}
            style={{ width: `${width}%` }}
          />
        </div>
      ))}
    </NeoCard>
  );
}

/** Stock, ordered by the revenue behind it rather than by how empty it is. */
export function StockMock() {
  const rows: [string, string, string][] = [
    ["Manjistha Soap", "6 days", "bg-[#ff6b5a]"],
    ["Goat Milk Soap", "9 days", "bg-[#ffd93d]"],
    ["Rose Clay Powder", "21 days", "bg-[#7bdc9b]"],
  ];

  return (
    <NeoCard tint="bg-[#ff8fab]" className="flex flex-col gap-3">
      <span className="text-lg font-extrabold tracking-tight">Days of cover</span>
      {rows.map(([name, cover, dot]) => (
        <div
          key={name}
          className="flex items-center gap-3 rounded-lg border-[3px] border-black bg-white p-3 shadow-[4px_4px_0_0_#000]"
        >
          <span className={`size-4 shrink-0 rounded-full border-[3px] border-black ${dot}`} />
          <span className="flex-1 text-sm font-extrabold sm:text-base">{name}</span>
          <span className="text-sm font-bold text-black/70">{cover}</span>
        </div>
      ))}
      <p className="text-sm font-bold">Revenue at risk: ₹4.2L</p>
    </NeoCard>
  );
}

/** The message a customer actually receives, and their reply. */
export function MessageMock() {
  return (
    <NeoCard tint="bg-[#7bdc9b]" className="flex flex-col gap-3">
      <span className="text-lg font-extrabold tracking-tight">On their phone</span>
      <div className="rounded-lg border-[3px] border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
        <div className="mb-2 h-24 rounded-md border-[3px] border-black bg-[#ffd93d]" />
        <p className="text-sm leading-relaxed font-bold sm:text-base">
          Hi Priya, your Rose Clay is running low.
          <br />
          Reorder here: your-store.com/rose-clay
        </p>
      </div>
      <div className="self-end rounded-lg border-[3px] border-black bg-white px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_#000]">
        Yes please — can you send two?
      </div>
    </NeoCard>
  );
}

/** A sequence, and the two steps that never send. */
export function FlowMock() {
  const steps: [string, string, boolean][] = [
    ["Day 0", "Reminder naming their product", false],
    ["Day 3", "A code, expiring in a fortnight", true],
    ["Day 10", "Last note before it lapses", true],
  ];

  return (
    <NeoCard tint="bg-[#ffd93d]" className="flex flex-col gap-3">
      <span className="text-lg font-extrabold tracking-tight">Win-back sequence</span>
      {steps.map(([day, text, dropped]) => (
        <div
          key={day}
          className={`rounded-lg border-[3px] border-black p-3 shadow-[4px_4px_0_0_#000] ${
            dropped ? "bg-white/50" : "bg-white"
          }`}
        >
          <p className="text-sm font-extrabold sm:text-base">{day}</p>
          <p className="text-sm font-medium text-black/70">{text}</p>
          {dropped ? (
            <p className="mt-1 text-xs font-extrabold">Never sent — they ordered on day 4</p>
          ) : null}
        </div>
      ))}
    </NeoCard>
  );
}

/** The assistant proposing, and waiting. */
export function AssistantMock() {
  return (
    <NeoCard tint="bg-[#ff8fab]" className="flex flex-col gap-3">
      <span className="text-lg font-extrabold tracking-tight">The assistant</span>
      <div className="rounded-lg border-[3px] border-black bg-white p-3 text-sm font-bold shadow-[4px_4px_0_0_#000] sm:text-base">
        Which customers are about to churn?
      </div>
      <div className="rounded-lg border-[3px] border-black bg-white p-3 text-sm font-medium shadow-[4px_4px_0_0_#000] sm:text-base">
        214 customers are past their own usual reorder gap, worth ₹4.2L in predicted value.
      </div>
      <div className="rounded-lg border-[3px] border-black bg-[#2f66e8] p-3 text-white shadow-[4px_4px_0_0_#000]">
        <p className="text-sm font-extrabold sm:text-base">Proposal · win-back to 214 customers</p>
        <div className="mt-2 flex gap-2">
          <span className="rounded-md border-[3px] border-black bg-white px-3 py-1 text-sm font-extrabold text-black">
            Approve
          </span>
          <span className="rounded-md border-[3px] border-black bg-white px-3 py-1 text-sm font-extrabold text-black">
            Reject
          </span>
        </div>
      </div>
    </NeoCard>
  );
}
