import { prisma } from '@/lib/prisma';

export type CurrentState = {
  slug: string;
  name: string;
};

export function getCurrentState(request: Request): CurrentState | null {
  const slug = request.headers.get('x-state-slug');
  const name = request.headers.get('x-state-name');
  if (!slug || !name) { return null; }
  return { slug, name };
}

export async function getStateBySlug(slug: string) {
  return prisma.state.findUnique({ where: { slug: slug.toLowerCase() } });
}

export function normalizeStateName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function isStateLive(slug: string): Promise<boolean> {
  const state = await getStateBySlug(slug);
  return state?.status === 'live';
}
