// Small set of shared building blocks so every page looks and behaves the same.

export const inputClass =
  "w-full rounded-lg border border-primary/15 bg-white px-3.5 py-2.5 text-sm text-primary " +
  "placeholder:text-primary/35 outline-none transition " +
  "focus:border-secondary focus:ring-2 focus:ring-secondary/20 " +
  "disabled:cursor-not-allowed disabled:bg-primary/5 disabled:text-primary/50";

export function Page({ title, description, actions, children, width = "max-w-6xl" }) {
  return (
    <section className="min-h-screen bg-linen px-4 pb-20 pt-36 sm:px-6 md:pt-28 lg:px-8">
      <div className={`mx-auto ${width}`}>
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium text-primary sm:text-4xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-primary/60">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
        <div className="grid gap-6">{children}</div>
      </div>
    </section>
  );
}

export function Card({ title, description, actions, children, className = "", flush = false }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-primary/10 bg-white ${className}`}>
      {title || actions ? (
        <div className="flex flex-col gap-3 border-b border-primary/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? <h2 className="font-serif text-xl font-medium text-primary">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-primary/55">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </div>
  );
}

const buttonVariants = {
  primary: "bg-secondary text-white hover:bg-primary",
  dark: "bg-primary text-white hover:bg-secondary",
  outline: "border border-primary/15 bg-white text-primary hover:border-secondary hover:text-secondary",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-primary/70 hover:bg-primary/5 hover:text-primary"
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm"
};

export function buttonClass(variant = "primary", size = "md", extra = "") {
  return (
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 " +
    "disabled:cursor-not-allowed disabled:opacity-50 " +
    `${buttonVariants[variant]} ${buttonSizes[size]} ${extra}`
  );
}

export function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function Field({ label, required = false, hint, children, className = "" }) {
  return (
    <label className={`grid content-start gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-primary/75">
        {label}
        {required ? <span className="text-secondary"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-primary/50">{hint}</span> : null}
    </label>
  );
}

export function Notice({ tone = "info", children, className = "" }) {
  if (!children) return null;
  const tones = {
    info: "border-primary/10 bg-primary/5 text-primary/80",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900"
  };
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]} ${className}`}
    >
      {children}
    </p>
  );
}

const badgeTones = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-primary/10 bg-primary/5 text-primary/55",
  admin: "border-secondary/30 bg-secondary/10 text-secondary",
  supervisor: "border-sky-200 bg-sky-50 text-sky-800",
  employee: "border-primary/10 bg-primary/5 text-primary/70",
  neutral: "border-primary/10 bg-primary/5 text-primary/70"
};

export function Badge({ tone = "neutral", children }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
        badgeTones[tone] || badgeTones.neutral
      }`}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white px-5 py-4">
      <p className="text-sm text-primary/55">{label}</p>
      <p className="mt-1 font-serif text-3xl font-medium text-primary">{value}</p>
      {note ? <p className="mt-1 text-xs text-primary/50">{note}</p> : null}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div
      role="tablist"
      className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-primary/10 bg-white p-1"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            value === tab.value
              ? "bg-primary text-white"
              : "text-primary/65 hover:bg-primary/5 hover:text-primary"
          }`}
        >
          {tab.label}
          {tab.count ? (
            <span
              className={`rounded-full px-1.5 text-xs ${
                value === tab.value ? "bg-white/20" : "bg-secondary text-white"
              }`}
            >
              {tab.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="px-5 py-10 text-center text-sm text-primary/50">{children}</p>;
}

export function Loading({ children = "Loading…" }) {
  return <p className="px-5 py-10 text-center text-sm text-primary/50">{children}</p>;
}

export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-primary/10 text-xs text-primary/50">
          <tr>
            {head.map((cell, index) => (
              <th
                key={index}
                scope="col"
                className={`whitespace-nowrap px-5 py-3 font-medium ${cell?.right ? "text-right" : ""}`}
              >
                {cell?.label ?? cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-primary/5">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-5 py-3.5 align-top text-primary/75";
export const tdStrong = "px-5 py-3.5 align-top font-medium text-primary";
