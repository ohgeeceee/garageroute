"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, QrCode } from "lucide-react";
import { Sale } from "@/data/sales";
import AdminNav from "@/components/manage/AdminNav";
import DashboardStats from "@/components/manage/DashboardStats";
import ItemManager from "@/components/manage/ItemManager";
import SaleEditor from "@/components/manage/SaleEditor";
import QueueManager from "@/components/QueueManager";
import ShareButtons from "@/components/ShareButtons";
import DonationManager from "@/components/DonationManager";
import Inbox from "@/components/Inbox";
import ReservationsManager from "@/components/ReservationsManager";
import SaleSettings from "@/components/manage/SaleSettings";

type TabId = "overview" | "inventory" | "settings" | "queue" | "messages" | "reservations" | "donations" | "share";

export default function ManagePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<TabId>("overview");

  const refreshSale = async () => {
    const res = await fetch(`/api/manage/${token}`);
    if (!res.ok) return;
    const data = (await res.json()) as Sale;
    setSale(data);
  };

  useEffect(() => {
    fetch(`/api/manage/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Sale not found");
        return res.json();
      })
      .then((data) => {
        setSale(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load this sale.");
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    refreshSale();
  }, [active]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-zinc-900">Sale not found</h1>
        <p className="mt-2 text-zinc-600">{error}</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 text-blue-600 hover:underline">
          ← Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={`/sales/${sale.id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Back to sale
      </Link>

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900">Manage your sale</h1>
        <p className="text-zinc-600">{sale.title}</p>
      </div>

      <AdminNav
        active={active}
        onChange={(next) => setActive(next as TabId)}
        counts={{
          queue: 0,
          messages: 0,
          reservations: 0,
        }}
      />

      <div className="mt-6 space-y-6">
        {active === "overview" && (
          <div className="space-y-6">
            <DashboardStats sale={sale} />
            <ItemManager sale={sale} token={token} onUpdate={setSale} />
          </div>
        )}

        {active === "inventory" && (
          <ItemManager sale={sale} token={token} onUpdate={setSale} />
        )}

        {active === "settings" && (
          <div className="space-y-6">
            <SaleEditor sale={sale} token={token} onUpdate={setSale} />
            <SaleSettings sale={sale} token={token} onUpdate={setSale} />
          </div>
        )}

        {active === "queue" && (
          <QueueManager token={token} />
        )}

        {active === "messages" && (
          <Inbox token={token} />
        )}

        {active === "reservations" && (
          <ReservationsManager token={token} />
        )}

        {active === "donations" && (
          <DonationManager
            sale={sale}
            token={token}
            onUpdate={(updated) => setSale((prev) => (prev ? { ...prev, ...updated } : prev))}
          />
        )}

        {active === "share" && (
          <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold text-zinc-900">Share this sale</h2>
            <p className="text-sm text-zinc-600">
              Cross-post to social media or copy a Craigslist-ready description.
            </p>
            <ShareButtons sale={sale} />
            <Link
              href={`/sales/${sale.id}/flyer`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <QrCode className="h-4 w-4" />
              Open printable flyer
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}