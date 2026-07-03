import { BrushStroke, SiteFooter, SiteHeader } from "#/components/site-chrome";

interface LegalPageProps {
  title: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
}

export function LegalPage({ title, updated, intro, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16 md:py-20">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Last updated: {updated}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <BrushStroke className="mt-4 h-2 w-20" />
        <p className="mt-6 text-[15px] leading-[1.75] text-muted-foreground">{intro}</p>
        <div className="mt-10 space-y-10">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-baseline gap-3 text-lg font-semibold tracking-tight">
        <span className="font-mono text-sm text-copper">{number}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-[1.75] text-muted-foreground [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[9px] size-1 shrink-0 rounded-full bg-copper" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
