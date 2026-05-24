import { architectureCards } from "../data/architectureCards";

export function ArchitectureGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {architectureCards.map((card) => (
        <article key={card.title} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
          <h3 className="text-lg font-semibold text-white">{card.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{card.body}</p>
        </article>
      ))}
    </section>
  );
}
