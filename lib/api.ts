import { Sale } from "@/data/sales";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function normalizeSale(sale: Record<string, unknown>): Sale {
  const photos =
    typeof sale.photos === "string"
      ? JSON.parse(sale.photos || "[]")
      : Array.isArray(sale.photos)
      ? sale.photos
      : [];
  return { ...(sale as Sale), photos };
}

export async function fetchSales(
  searchParams?: URLSearchParams
): Promise<Sale[]> {
  const url = `${baseUrl}/api/sales${
    searchParams ? `?${searchParams.toString()}` : ""
  }`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error("Failed to fetch sales");
  const data = await res.json();
  return data.map(normalizeSale);
}

export async function fetchSale(id: string): Promise<Sale> {
  const res = await fetch(`${baseUrl}/api/sales/${id}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error("Failed to fetch sale");
  return normalizeSale(await res.json());
}

export async function createSale(body: Record<string, unknown>): Promise<Sale> {
  const res = await fetch(`${baseUrl}/api/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create sale");
  }
  return normalizeSale(await res.json());
}
