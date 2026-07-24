import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Entry = {
  id: string;
  order_id: string;
  phone_number: string | null;
  customer_name: string;
  month_key: string;
  created_at: string;
};
type Winner = {
  id: string;
  month_key: string;
  customer_name: string;
  phone_number: string | null;
  drawn_at: string;
};

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function endOfMonthUTC(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
}
function normalizePhone(p: string) {
  return p.replace(/\D/g, "");
}
function ticketNumber(entryId: string) {
  // Short stable ticket number derived from the entry uuid
  return "T-" + entryId.replace(/-/g, "").slice(0, 6).toUpperCase();
}
function maskPhone(p: string | null) {
  if (!p) return "••••";
  const digits = p.replace(/\D/g, "");
  return digits ? "•••• " + digits.slice(-4) : "••••";
}
function firstName(name: string) {
  return (name || "").trim().split(/\s+/)[0] ?? "Winner";
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, target.getTime() - now);
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

type Prize = {
  id: string;
  title: string;
  description: string | null;
  prize_value: string;
  image_url: string | null;
  end_date: string | null;
  is_active: boolean;
};

export function GiveawaySection() {
  const currentMonth = monthKey(new Date());

  const { data: prize } = useQuery({
    queryKey: ["giveaway", "active-prize"],
    queryFn: async () => {
      const { data, error } = await (supabase as never as typeof supabase)
        .from("giveaway_prizes" as never)
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Prize | null;
    },
  });

  const drawDate = useMemo(() => {
    if (prize?.end_date) return new Date(prize.end_date);
    const end = endOfMonthUTC();
    return new Date(end.getTime() - 24 * 3600 * 1000);
  }, [prize?.end_date]);
  const countdownTarget = useMemo(
    () => (prize?.end_date ? new Date(prize.end_date) : endOfMonthUTC()),
    [prize?.end_date],
  );
  const countdown = useCountdown(countdownTarget);

  const { data: entries } = useQuery({
    queryKey: ["giveaway", "entries", currentMonth],
    queryFn: async () => {
      const { data, error } = await (supabase as never as typeof supabase)
        .from("giveaway_entries" as never)
        .select("*")
        .eq("month_key", currentMonth);
      if (error) throw error;
      return (data ?? []) as unknown as Entry[];
    },
    refetchInterval: 60_000,
  });

  const { data: winners } = useQuery({
    queryKey: ["giveaway", "winners"],
    queryFn: async () => {
      const { data, error } = await (supabase as never as typeof supabase)
        .from("giveaway_winners" as never)
        .select("*")
        .order("drawn_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Winner[];
    },
  });

  const totalTickets = entries?.length ?? 0;
  const participants = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries ?? []) s.add(e.phone_number ?? e.id);
    return s.size;
  }, [entries]);

  const previousWinner = winners?.find((w) => w.month_key !== currentMonth) ?? null;
  const [showAllWinners, setShowAllWinners] = useState(false);

  // Personal tickets lookup (no auth in app — key by phone number)
  const [phone, setPhone] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("kc.giveaway.phone") ?? "";
  });
  const [phoneInput, setPhoneInput] = useState(phone);
  const [showMine, setShowMine] = useState(false);

  const myEntries = useMemo(() => {
    if (!phone) return [];
    const norm = normalizePhone(phone);
    return (entries ?? []).filter(
      (e) => e.phone_number && normalizePhone(e.phone_number) === norm,
    );
  }, [entries, phone]);

  const { data: myAllEntries } = useQuery({
    queryKey: ["giveaway", "mine-all", phone],
    enabled: !!phone,
    queryFn: async () => {
      const norm = normalizePhone(phone);
      const { data, error } = await (supabase as never as typeof supabase)
        .from("giveaway_entries" as never)
        .select("*");
      if (error) throw error;
      return ((data ?? []) as unknown as Entry[]).filter(
        (e) => e.phone_number && normalizePhone(e.phone_number) === norm,
      );
    },
  });

  const savePhone = (p: string) => {
    const trimmed = p.trim();
    setPhone(trimmed);
    if (typeof window !== "undefined") {
      if (trimmed) localStorage.setItem("kc.giveaway.phone", trimmed);
      else localStorage.removeItem("kc.giveaway.phone");
    }
  };

  return (
    <section className="px-6 md:px-8 py-16 md:py-20 border-b-2 border-forest bg-sand">
      <div className="border-2 border-forest bg-safety/10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-6 md:p-10 border-b-2 border-forest">
          <div>
            <p className="label-mono text-safety mb-3">🎁 Monthly Giveaway</p>
            <h2 className="font-display text-4xl md:text-6xl uppercase tracking-tighter leading-none">
              Win This Month's Prize
            </h2>
            <p className="label-mono text-forest/70 mt-3">
              1 Completed Order = 1 Giveaway Ticket
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <a href="#giveaway-info" className="btn-outline">Learn More</a>
            <button
              onClick={() => setShowMine((v) => !v)}
              className="btn-forest"
            >
              View My Tickets
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-forest">
          {/* Prize */}
          <div className="p-6 md:p-8">
            <p className="label-mono text-forest/60 mb-4">Current Prize</p>
            <div className="aspect-square border-2 border-forest bg-forest text-sand flex items-center justify-center mb-4 overflow-hidden">
              {prize?.image_url ? (
                <img
                  src={prize.image_url}
                  alt={prize.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display text-7xl">🎁</span>
              )}
            </div>
            <h3 className="font-display text-2xl uppercase tracking-tighter">
              {prize?.title ?? "Walki Talkie Prize Pack"}
            </h3>
            {prize?.prize_value && (
              <p className="label-mono text-forest/60 mt-1">Value: {prize.prize_value}</p>
            )}
            {prize?.description && (
              <p className="text-sm text-forest/70 mt-2">{prize.description}</p>
            )}
          </div>


          {/* Countdown + Stats */}
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <p className="label-mono text-forest/60 mb-3">Giveaway Ends In</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: "Days", v: countdown.days },
                  { l: "Hrs", v: countdown.hours },
                  { l: "Min", v: countdown.minutes },
                  { l: "Sec", v: countdown.seconds },
                ].map((b) => (
                  <div key={b.l} className="border-2 border-forest text-center py-3">
                    <div className="font-display text-3xl tabular-nums leading-none">
                      {String(b.v).padStart(2, "0")}
                    </div>
                    <div className="label-mono text-[10px] text-forest/60 mt-1">
                      {b.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Tickets Issued" value={String(totalTickets)} />
              <Stat label="Participants" value={String(participants)} />
            </div>
            <div className="border-2 border-forest p-4">
              <p className="label-mono text-forest/60 mb-1">Next Draw</p>
              <p className="font-display text-xl uppercase tracking-tight">
                {drawDate.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </p>
            </div>
          </div>

          {/* Previous Winner */}
          <div className="p-6 md:p-8">
            <p className="label-mono text-forest/60 mb-4">Previous Winner</p>
            {previousWinner ? (
              <div className="border-2 border-forest p-5 bg-sand">
                <p className="label-mono text-safety mb-2">
                  {previousWinner.month_key}
                </p>
                <p className="font-display text-3xl uppercase tracking-tighter leading-none mb-2">
                  {firstName(previousWinner.customer_name)} 🏆
                </p>
                <p className="label-mono text-forest/70">
                  {maskPhone(previousWinner.phone_number)}
                </p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-forest/40 p-5 text-center label-mono text-forest/60">
                First winner will be announced at the end of this month.
              </div>
            )}
            <button
              onClick={() => setShowAllWinners((v) => !v)}
              className="mt-4 label-mono border-b-2 border-forest hover:text-safety hover:border-safety"
            >
              {showAllWinners ? "Hide" : "View"} Previous Winners →
            </button>
            {showAllWinners && (
              <ul className="mt-4 space-y-2">
                {(winners ?? []).length === 0 && (
                  <li className="label-mono text-forest/60">No winners yet.</li>
                )}
                {(winners ?? []).map((w) => (
                  <li
                    key={w.id}
                    className="flex justify-between text-sm border-b border-forest/20 pb-2"
                  >
                    <span className="font-semibold uppercase tracking-wider">
                      {firstName(w.customer_name)}
                    </span>
                    <span className="label-mono text-forest/60">
                      {w.month_key} · {maskPhone(w.phone_number)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Personal tickets */}
        {showMine && (
          <div className="border-t-2 border-forest p-6 md:p-10 bg-sand">
            <p className="label-mono text-safety mb-3">Your Giveaway Tickets</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePhone(phoneInput);
              }}
              className="flex flex-col md:flex-row gap-3 mb-6 max-w-xl"
            >
              <input
                type="tel"
                inputMode="tel"
                required
                placeholder="Enter your phone number (e.g. 09xxxxxxxxx)"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="flex-1 border-2 border-forest bg-sand px-4 py-3 label-mono focus:outline-none focus:border-safety"
              />
              <button type="submit" className="btn-forest">Show Tickets</button>
            </form>

            {phone && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Stat label="Tickets This Month" value={String(myEntries.length)} />
                <Stat
                  label="Your Total Entries"
                  value={String(myAllEntries?.length ?? 0)}
                />
                <Stat
                  label="Chance This Month"
                  value={
                    totalTickets > 0
                      ? `${((myEntries.length / totalTickets) * 100).toFixed(1)}%`
                      : "—"
                  }
                />
              </div>
            )}

            {phone && myEntries.length > 0 && (
              <>
                <p className="label-mono text-forest/60 mb-3">
                  Your Ticket Numbers ({currentMonth})
                </p>
                <div className="flex flex-wrap gap-2">
                  {myEntries.map((e) => (
                    <span
                      key={e.id}
                      className="label-mono border-2 border-forest px-3 py-2 bg-safety/20"
                    >
                      {ticketNumber(e.id)}
                    </span>
                  ))}
                </div>
              </>
            )}
            {phone && myEntries.length === 0 && (
              <p className="label-mono text-forest/60">
                No tickets found for this phone number this month. Place an order to enter!
              </p>
            )}
          </div>
        )}

        <div
          id="giveaway-info"
          className="border-t-2 border-forest p-6 md:p-8 bg-forest text-sand"
        >
          <p className="label-mono text-safety mb-2">How It Works</p>
          <p className="text-sm md:text-base text-sand/80 max-w-3xl leading-relaxed">
            Every completed order automatically earns you one entry into the
            current month's giveaway. Place more orders to increase your
            chances. On the last day of each month, we randomly draw one
            winner from all entries. Entries reset for the new month —
            the more you shop, the higher your odds.
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-forest p-4">
      <p className="label-mono text-forest/60 mb-1 text-[11px]">{label}</p>
      <p className="font-display text-3xl uppercase tracking-tighter tabular-nums">
        {value}
      </p>
    </div>
  );
}
