import Link from "next/link";

const pillars = [
  {
    title: "Daily stewardship",
    body: "Capture thoughtful work logs across housekeeping, operations, HR, finance, and IT without clutter."
  },
  {
    title: "Approved access",
    body: "Employees enter only after admin approval, keeping internal resort operations private and trusted."
  },
  {
    title: "Quiet reporting",
    body: "Admins review hours, staff activity, and Excel exports through a calm, resort-grade interface."
  }
];

export default function HomePage() {
  return (
    <div className="bg-linen text-primary">
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <img
          src="/hero-mruda.jpeg"
          alt="Mruda Eco Village campus"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/45 to-primary/10" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-linen to-transparent" />

        <div className="relative mx-auto w-full max-w-7xl px-6 pb-24 pt-44 lg:px-8">
          <div className="max-w-3xl animate-reveal text-white">
            <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.5em] text-white/75">
              Internal Operations
            </p>
            <h1 className="font-serif text-5xl font-medium leading-[0.95] text-shadow-lg sm:text-7xl lg:text-8xl">
              Work in rhythm with nature.
            </h1>
            <p className="mt-8 max-w-2xl text-base font-light leading-8 text-white/82 sm:text-lg">
              A premium role-based timesheet system for Mruda Eco Village, shaped with the same calm, organic experience as the resort itself.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/timesheet"
                className="btn-smooth rounded-full bg-secondary px-8 py-4 text-[11px] font-bold uppercase tracking-[0.35em] text-white hover:bg-white hover:text-primary"
              >
                Add Timesheet
              </Link>
              <Link
                href="/dashboard"
                className="btn-smooth rounded-full border border-white/35 bg-white/10 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.35em] text-white backdrop-blur-md hover:bg-white hover:text-primary"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-32">
        <div className="animate-reveal">
          <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-secondary">
            Sustainable systems
          </p>
          <h2 className="mt-5 font-serif text-4xl font-medium leading-tight text-primary sm:text-6xl">
            A softer way to manage daily hotel work.
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {pillars.map((pillar, index) => (
            <article
              key={pillar.title}
              className="hover-lift rounded-[1.5rem] border border-primary/5 bg-white p-7 shadow-luxury"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <span className="font-serif text-4xl text-secondary">0{index + 1}</span>
              <h3 className="mt-8 font-serif text-2xl font-medium text-primary">{pillar.title}</h3>
              <p className="mt-4 text-sm font-light leading-7 text-primary/62">{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24 lg:px-8 lg:pb-32">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-primary text-white shadow-luxury">
          <div className="grid lg:grid-cols-[1fr_0.9fr]">
            <div className="p-8 sm:p-12 lg:p-16">
              <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-white/50">
                Mruda Eco Village
              </p>
              <h2 className="mt-5 font-serif text-4xl font-medium leading-tight sm:text-6xl">
                Minimal tools for mindful operations.
              </h2>
              <p className="mt-6 max-w-2xl text-sm font-light leading-8 text-white/68">
                The interface keeps the work practical while preserving the resort language: quiet surfaces, earthy accents, open spacing, and deliberate motion.
              </p>
            </div>
            <div className="min-h-80 bg-[linear-gradient(135deg,rgba(166,95,68,.9),rgba(212,163,115,.45)),url('/hero-mruda.jpeg')] bg-cover bg-center" />
          </div>
        </div>
      </section>
    </div>
  );
}
