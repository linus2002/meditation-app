/**
 * The full-bleed abstract sweep behind the first onboarding screen.
 *
 * Built from layered gradients rather than an image: it scales to any handset
 * without shipping a large asset, and it uses Serenity's own palette rather
 * than borrowing anyone else's artwork.
 *
 * The bands are deliberately kept narrow and only lightly blurred — a wide,
 * heavy blur turns the whole thing into a flat wash and loses the folded look.
 */
export function AuroraSweep({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={className}>
      {/* Dark base, so the bands have somewhere to read against. */}
      <div className="absolute inset-0 bg-[linear-gradient(168deg,#151A5E_0%,#101347_30%,#0C0E33_58%,#0A0C24_100%)]" />

      {/* The wide ribbon sweeping down from the top-left. */}
      <div
        className="absolute -left-[35%] -top-[10%] h-[52%] w-[180%] rotate-[-27deg] blur-[14px]"
        style={{
          background:
            'linear-gradient(92deg, rgba(58,208,216,0.0) 0%, rgba(64,196,224,0.75) 12%, rgba(126,116,244,0.92) 34%, rgba(206,86,214,0.95) 52%, rgba(150,92,238,0.8) 68%, rgba(70,150,230,0.45) 84%, rgba(20,28,110,0) 100%)',
        }}
      />

      {/* A brighter fold riding just above it. */}
      <div
        className="absolute -left-[28%] top-[8%] h-[18%] w-[165%] rotate-[-25deg] blur-[10px]"
        style={{
          background:
            'linear-gradient(92deg, rgba(255,255,255,0) 0%, rgba(236,222,255,0.55) 22%, rgba(226,132,240,0.75) 44%, rgba(150,130,246,0.5) 66%, rgba(60,190,220,0.3) 82%, rgba(20,28,110,0) 100%)',
        }}
      />

      {/* Turquoise underside, lower and slower. */}
      <div
        className="absolute -left-[30%] top-[30%] h-[22%] w-[150%] rotate-[-15deg] blur-[18px]"
        style={{
          background:
            'linear-gradient(92deg, rgba(28,196,186,0.0) 0%, rgba(34,206,196,0.72) 18%, rgba(56,138,226,0.5) 48%, rgba(70,80,200,0.22) 72%, rgba(18,26,105,0) 100%)',
        }}
      />

      {/* A thin magenta thread for depth. */}
      <div
        className="absolute -left-[20%] top-[24%] h-[6%] w-[140%] rotate-[-21deg] blur-[7px]"
        style={{
          background:
            'linear-gradient(92deg, rgba(255,120,220,0) 0%, rgba(246,124,222,0.8) 30%, rgba(180,96,240,0.55) 60%, rgba(40,50,160,0) 90%)',
        }}
      />

      {/* Darkens the corners so the bands read as a ribbon, not a wash. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_75%_at_50%_18%,rgba(10,12,36,0)_38%,rgba(10,12,36,0.55)_78%,rgba(10,12,36,0.85)_100%)]" />

      {/* Settles the lower half to solid canvas so the type stays legible. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,36,0)_34%,rgba(10,12,36,0.8)_56%,#0A0C24_74%)]" />
    </div>
  );
}
