import { Button } from '@/components/ui/button';

type FeaturePlaceholderProps = {
  section: string;
  title: string;
  description: string;
  ctaLabel?: string;
};

export function FeaturePlaceholder({ section, title, description, ctaLabel }: FeaturePlaceholderProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {ctaLabel ? (
        <Button className="mt-4" size="sm" type="button">
          {ctaLabel}
        </Button>
      ) : null}
    </section>
  );
}
