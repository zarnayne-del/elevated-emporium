import { useEffect, useState } from "react";

const KEY = "kc-age-verified-v1";

export function AgeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY) !== "yes") setOpen(true);
  }, []);

  if (!open) return null;

  const accept = () => {
    localStorage.setItem(KEY, "yes");
    setOpen(false);
  };

  const reject = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-forest/90 backdrop-blur-sm px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="w-full max-w-lg bg-sand border-2 border-forest p-10 md:p-14 text-center">
        <p className="label-mono text-safety mb-4">Restricted Access</p>
        <h2
          id="age-gate-title"
          className="font-display text-4xl md:text-5xl uppercase tracking-tighter mb-6 text-forest leading-none"
        >
          You must be<br />18 or older
        </h2>
        <p className="text-sm leading-relaxed mb-10 text-forest/80">
          Kush &amp; Cotton sells regulated cannabis goods and curated
          streetwear. Please confirm your age to continue.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={reject}
            className="py-4 border-2 border-forest font-display uppercase text-xs tracking-[0.2em] hover:bg-forest hover:text-sand transition-colors cursor-pointer"
          >
            Exit
          </button>
          <button
            onClick={accept}
            className="py-4 bg-forest text-sand font-display uppercase text-xs tracking-[0.2em] hover:bg-moss transition-colors cursor-pointer"
          >
            I am 18+
          </button>
        </div>
        <p className="label-mono text-forest/40 mt-8">
          By entering you agree to our terms &amp; age policy.
        </p>
      </div>
    </div>
  );
}
