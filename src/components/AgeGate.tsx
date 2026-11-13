import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const KEY = "kc-age-verified-v1";

export function AgeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { if (localStorage.getItem(KEY) !== "yes") setOpen(true); } catch { setOpen(true); }
  }, []);

  if (!open) return null;

  const accept = () => {
    try { localStorage.setItem(KEY, "yes"); } catch { /* Allow this visit without persistence. */ }
    setOpen(false);
  };

  const reject = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <Dialog open={open}>
      <DialogContent onEscapeKeyDown={e => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()} className="z-[100] w-[calc(100%-3rem)] max-w-lg bg-sand border-2 border-forest p-8 md:p-14 text-center [&>button]:hidden">
        <p className="label-mono text-safety-text mb-4">Restricted Access</p>
        <DialogTitle
          id="age-gate-title"
          className="font-display text-4xl md:text-5xl uppercase tracking-tighter mb-6 text-forest leading-none"
        >
          You must be<br />18 or older
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed mb-10 text-muted-foreground">
          Please confirm your age to enter WALKI TALKIE. Purchasing is currently paused.
        </DialogDescription>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline"
            onClick={reject}
            className="py-4 border-2 border-forest font-display uppercase text-xs tracking-[0.2em] hover:bg-forest hover:text-sand transition-colors cursor-pointer"
          >
            Exit
          </Button>
          <Button
            onClick={accept}
            className="py-4 bg-forest text-sand font-display uppercase text-xs tracking-[0.2em] hover:bg-moss transition-colors cursor-pointer"
          >
            I am 18+
          </Button>
        </div>
        <p className="label-mono text-muted-foreground mt-8">
          Adults only.
        </p>
      </DialogContent>
    </Dialog>
  );
}
