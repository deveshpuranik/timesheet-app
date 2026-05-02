export default function FormField({ label, required = false, children }) {
  return (
    <label className="group grid gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/45">
        {label}
        {required ? <span className="text-secondary"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
