export default function BrandButton({
  children,
  className = "",
  variant = "primary",
  ...props
}) {
  const variants = {
    primary: "bg-secondary text-white hover:bg-primary",
    dark: "bg-primary text-white hover:bg-secondary",
    ghost: "border border-primary/10 bg-white/70 text-primary hover:border-secondary/40 hover:bg-secondary/10"
  };

  return (
    <button
      className={`btn-smooth rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-[0.28em] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
