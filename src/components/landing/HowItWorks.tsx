const steps = [
  {
    n: "01",
    title: "Cadastre sua clínica",
    desc: "Configure profissionais, horários e procedimentos em poucos minutos.",
  },
  {
    n: "02",
    title: "Compartilhe o link",
    desc: "Pacientes agendam pelo portal público — funciona 24/7, sem ligação.",
  },
  {
    n: "03",
    title: "Receba e atenda",
    desc: "Lembretes automáticos, confirmações por WhatsApp e agenda sempre cheia.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how" className="bg-secondary/40 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">
            Como funciona
          </span>
          <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Comece em 3 passos simples
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="font-display text-7xl font-extrabold text-primary/15">{s.n}</div>
              <h3 className="-mt-4 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
