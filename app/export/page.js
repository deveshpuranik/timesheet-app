export default function ExportPage() {
  return (
    <section className="min-h-screen bg-linen px-6 pb-24 pt-40 lg:px-8">
      <div className="mx-auto max-w-4xl animate-reveal">
        <div className="overflow-hidden rounded-[2rem] bg-primary text-white shadow-luxury">
          <div className="grid lg:grid-cols-[1fr_0.8fr]">
            <div className="p-8 sm:p-12">
              <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-white/50">
                Excel Export
              </p>
              <h1 className="mt-5 font-serif text-5xl font-medium leading-tight">
                Download authorized timesheet data.
              </h1>
              <p className="mt-6 text-sm font-light leading-8 text-white/68">
                Export the entries you are authorized to view into an Excel workbook named timesheet.xlsx with name, department, date, time, hours, work type, and details.
              </p>
              <a
                href="/api/export"
                className="btn-smooth mt-10 inline-flex rounded-full bg-secondary px-8 py-4 text-[11px] font-bold uppercase tracking-[0.32em] text-white hover:bg-white hover:text-primary"
              >
                Download
              </a>
            </div>
            <div className="min-h-72 bg-[linear-gradient(135deg,rgba(166,95,68,.88),rgba(29,29,29,.25)),url('/hero-mruda.jpeg')] bg-cover bg-center" />
          </div>
        </div>
      </div>
    </section>
  );
}
