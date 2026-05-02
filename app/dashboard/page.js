import EntriesTable from "@/components/EntriesTable";

export default function DashboardPage() {
  return (
    <section className="min-h-screen bg-linen px-6 pb-24 pt-40 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-4xl animate-reveal">
          <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-secondary">
            Staff Operations
          </p>
          <h1 className="mt-5 font-serif text-5xl font-medium leading-tight text-primary sm:text-7xl">
            A quiet view of every working day.
          </h1>
        </div>
        <EntriesTable />
      </div>
    </section>
  );
}
