'use client';

export type FeaturePlaceholderProps = {
  section: string;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
};

export function FeaturePlaceholder({ section, title, description, ctaLabel, onCtaClick }: FeaturePlaceholderProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{section}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      {ctaLabel ? (
        <button
          type="button"
          onClick={onCtaClick}
          className="mt-4 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {ctaLabel}
        </button>
      ) : null}
    </section>
  );
}
