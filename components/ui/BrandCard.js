export default function BrandCard({ children, className = "" }) {
  return (
    <div className={`glass-card rounded-[1.5rem] p-6 shadow-luxury ${className}`}>
      {children}
    </div>
  );
}
