type FeaturePlaceholderProps = {
  section: string;
  title: string;
  description: string;
};

export function FeaturePlaceholder({ section, title, description }: FeaturePlaceholderProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{section}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
    </section>
  );
}
