export default function AuthShell({ title, subtitle, children }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linen px-4 py-28">
      <img
        src="/hero-mruda.jpeg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-primary/55" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-luxury sm:p-9">
        <img
          src="/logo.png"
          alt="Mruda Eco Village logo"
          className="mx-auto mb-5 h-16 w-16 rounded-full bg-white object-contain"
        />
        <h1 className="text-center font-serif text-3xl font-medium text-primary">{title}</h1>
        <p className="mb-7 mt-2 text-center text-sm leading-6 text-primary/60">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}
