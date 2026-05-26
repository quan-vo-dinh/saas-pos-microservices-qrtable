import type { BillingPeriod, PricingPlan } from '@/features/saas/types';

function normalizePlan(raw: Record<string, unknown>): PricingPlan | null {
  const id = String(raw.id ?? '');
  const code = String(raw.code ?? '').toUpperCase();
  if (!id || !code) return null;
  return {
    id,
    code,
    name: String(raw.name ?? code),
    description: raw.description != null ? String(raw.description) : null,
    priceVnd: Number(raw.priceVnd ?? 0) || 0,
    billingPeriod: (String(raw.billingPeriod ?? 'MONTHLY').toUpperCase() as BillingPeriod) || 'MONTHLY',
    maxTables: Number(raw.maxTables ?? 0) || 0,
    maxStaff: Number(raw.maxStaff ?? 0) || 0,
    maxOrdersPerDay: Number(raw.maxOrdersPerDay ?? 0) || 0,
    features: Array.isArray(raw.features) ? (raw.features as unknown[]).map((f) => String(f)) : [],
    isActive: Boolean(raw.isActive ?? true),
    displayOrder: Number(raw.displayOrder ?? 0) || 0,
  };
}

export async function getPublicPlans(): Promise<PricingPlan[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BFF_BASE_URL?.trim();
  if (!baseUrl) {
    return [];
  }
  const url = `${baseUrl.replace(/\/+$/, '')}/public/plans`;
  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) {
      return [];
    }
    const json = (await response.json()) as { data?: unknown };
    const rows = json?.data;
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }
    const mapped = rows
      .map((r) => normalizePlan(r as Record<string, unknown>))
      .filter((p): p is PricingPlan => p !== null)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return mapped;
  } catch {
    return [];
  }
}

export async function getPublicLandingInfo(): Promise<{ contactEmail: string; productName: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BFF_BASE_URL?.trim();
  const fallbackEmail = process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL?.trim() || 'support@qrtable.local';
  if (!baseUrl) {
    return { contactEmail: fallbackEmail, productName: 'QRTable' };
  }
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/public/landing-info`, { next: { revalidate: 600 } });
    if (!res.ok) {
      return { contactEmail: fallbackEmail, productName: 'QRTable' };
    }
    const json = (await res.json()) as { data?: { contactEmail?: string; productName?: string } };
    return {
      contactEmail: json.data?.contactEmail?.trim() || fallbackEmail,
      productName: json.data?.productName?.trim() || 'QRTable',
    };
  } catch {
    return { contactEmail: fallbackEmail, productName: 'QRTable' };
  }
}
