"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Package,
  BadgeCheck,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  ScrollText,
  Home,
  LogOut,
  Search,
  Hash,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShieldOff,
  Trash2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Link2,
  KeyRound,
  UserCog,
  Shield,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

type SaleSummary = {
  id: string;
  title: string;
  seller: string;
  city: string;
  state: string;
  verified: boolean;
  sellerToken: string;
};

type Mode = "search" | "actions" | "confirm";
type PendingConfirm = { kind: "delete"; sale: SaleSummary };

type Toast = { kind: "ok" | "err"; msg: string } | null;

type Item = {
  href?: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  group: string;
  keywords?: string;
  onSelect?: () => void | Promise<void>;
};

const SALE_ICON = Package;

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("search");
  const [selectedSale, setSelectedSale] = useState<SaleSummary | null>(null);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const fetchSeq = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state whenever the palette opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setMode("search");
      setSelectedSale(null);
      setPending(null);
      setSales([]);
      setToast(null);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  // Debounced sale search
  useEffect(() => {
    if (!open || mode !== "search") return;
    const term = search.trim();
    if (term.length < 2) {
      setSales([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++fetchSeq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/sales?q=${encodeURIComponent(term)}&pageSize=6`,
        );
        if (seq !== fetchSeq.current) return; // stale
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!res.ok) {
          setSales([]);
          return;
        }
        const data = (await res.json()) as {
          rows: Array<Omit<SaleSummary, "sellerToken"> & { sellerToken?: string }>;
        };
        const rows: SaleSummary[] = (data.rows || []).map((r) => ({
          id: r.id,
          title: r.title,
          seller: r.seller,
          city: r.city,
          state: r.state,
          verified: r.verified,
          sellerToken: (r as { sellerToken?: string }).sellerToken ?? "",
        }));
        if (seq !== fetchSeq.current) return;
        setSales(rows);
      } catch {
        if (seq === fetchSeq.current) setSales([]);
      } finally {
        if (seq === fetchSeq.current) setSearching(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [search, open, mode]);

  const flash = useCallback((kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
  }, []);

  const navigate = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const signOut = useCallback(async () => {
    await fetch("/api/admin", { method: "DELETE" });
    onClose();
    router.replace("/admin/login");
  }, [onClose, router]);

  const openSaleActions = useCallback((sale: SaleSummary) => {
    setSelectedSale(sale);
    setSearch("");
    setMode("actions");
  }, []);

  const backToSearch = useCallback(() => {
    setSelectedSale(null);
    setPending(null);
    setMode("search");
    setSearch("");
  }, []);

  // -- Sale actions --

  const toggleVerify = useCallback(async () => {
    if (!selectedSale || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales/${selectedSale.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !selectedSale.verified }),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      const nextVerified = !!json.verified;
      setSelectedSale({ ...selectedSale, verified: nextVerified });
      setSales((prev) =>
        prev.map((s) => (s.id === selectedSale.id ? { ...s, verified: nextVerified } : s)),
      );
      flash("ok", nextVerified ? "Listing verified." : "Verification removed.");
    } catch (e) {
      flash("err", (e as Error).message || "Failed to update.");
    } finally {
      setBusy(false);
    }
  }, [selectedSale, busy, flash]);

  const copyText = useCallback(
    async (label: string, text: string) => {
      if (!text) {
        flash("err", `${label} not available.`);
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        flash("ok", `${label} copied.`);
      } catch {
        flash("err", "Clipboard blocked by browser.");
      }
    },
    [flash],
  );

  const performDelete = useCallback(async () => {
    if (!pending || busy) return;
    const sale = pending.sale;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sales/${sale.id}`, {
        method: "DELETE",
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Delete failed");
      }
      setSales((prev) => prev.filter((s) => s.id !== sale.id));
      setPending(null);
      setSelectedSale(null);
      setMode("search");
      flash("ok", `Deleted "${sale.title}".`);
    } catch (e) {
      flash("err", (e as Error).message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }, [pending, busy, flash]);

  // -- Static items --

  const navItems: Item[] = [
    { href: "/admin/dashboard",     label: "Go to Dashboard",     description: "Platform overview & KPIs",  icon: LayoutDashboard, group: "Navigation" },
    { href: "/admin/sales",         label: "Go to Sales",         description: "Listings, verify, takedown", icon: Package,         group: "Navigation" },
    { href: "/admin/verifications", label: "Go to Verifications", description: "Review pending sellers",     icon: BadgeCheck,      group: "Navigation" },
    { href: "/admin/users",         label: "Go to Users",         description: "Buyer activity",            icon: Users,           group: "Navigation" },
    { href: "/admin/messages",      label: "Go to Messages",      description: "Inbox across all sales",     icon: MessageSquare,   group: "Navigation" },
    { href: "/admin/analytics",     label: "Go to Analytics",     description: "Funnel, revenue, growth",    icon: BarChart3,       group: "Navigation" },
    { href: "/admin/audit",         label: "Go to Audit log",     description: "Compliance trail",           icon: ScrollText,      group: "Navigation" },
    { href: "/admin/settings",      label: "Go to Settings",      description: "System preferences",         icon: Settings,        group: "Navigation" },
  ];

  const quickItems: Item[] = [
    { href: "/",     label: "View public site",     description: "Open garageroute.com", icon: Home,    group: "Quick links" },
    { href: "/post", label: "Create sale (public)", description: "Open the public poster", icon: Package, group: "Quick links" },
  ];

  if (!open) return null;

  // -- Confirm-mode view --
  if (mode === "confirm" && pending) {
    return (
      <PaletteShell onClose={onClose}>
        <ConfirmView
          sale={pending.sale}
          busy={busy}
          onCancel={backToSearch}
          onConfirm={performDelete}
        />
      </PaletteShell>
    );
  }

  // -- Actions-mode view --
  if (mode === "actions" && selectedSale) {
    return (
      <PaletteShell onClose={onClose}>
        <ActionsView
          sale={selectedSale}
          busy={busy}
          toast={toast}
          onBack={backToSearch}
          onOpen={() => navigate(`/admin/sales/${selectedSale.id}`)}
          onToggleVerify={toggleVerify}
          onCopyId={() => copyText("Sale ID", selectedSale.id)}
          onCopyUrl={() => copyText("Public URL", `${window.location.origin}/sales/${selectedSale.id}`)}
          onCopyToken={() => copyText("Seller link", selectedSale.sellerToken ? `${window.location.origin}/manage/${selectedSale.sellerToken}` : "")}
          onDelete={() => {
            setPending({ kind: "delete", sale: selectedSale });
            setMode("confirm");
          }}
        />
      </PaletteShell>
    );
  }

  // -- Search-mode view --
  return (
    <PaletteShell onClose={onClose} toast={toast}>
      <Command className="[&_[cmdk-input]]:w-full" shouldFilter>
        <div className="flex items-center gap-2 border-b border-surface-200 px-4">
          <Search className="h-4 w-4 shrink-0 text-surface-400" aria-hidden="true" />
          <Command.Input
            autoFocus
            placeholder="Type a command, or search sales…"
            value={search}
            onValueChange={setSearch}
            className="w-full bg-transparent py-3.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none"
          />
          {searching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-surface-400" aria-hidden="true" />
          ) : (
            <kbd className="rounded border border-surface-200 bg-surface-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-surface-500">
              ESC
            </kbd>
          )}
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto scroll-y p-2">
          <Command.Empty className="px-3 py-8 text-center text-sm text-surface-500">
            {search.trim().length >= 2
              ? "No matching sales or commands."
              : "Start typing to search sales, or pick a command."}
          </Command.Empty>

          <PaletteGroup label="Sales">
            {sales.map((s) => (
              <Command.Item
                key={s.id}
                value={`${s.title} ${s.seller} ${s.city} ${s.state} ${s.id}`}
                onSelect={() => openSaleActions(s)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-surface-700 aria-selected:bg-brand-50 aria-selected:text-brand-800"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-100 text-surface-600 aria-selected:bg-brand-100 aria-selected:text-brand-700">
                  <SALE_ICON className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="block truncate text-xs text-surface-500">
                    {s.seller} · {s.city}, {s.state}
                  </span>
                </span>
                {s.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-semibold text-warning-700">
                    Pending
                  </span>
                )}
              </Command.Item>
            ))}
          </PaletteGroup>

          <PaletteGroup label="Navigation">
            {navItems.map((item) => (
              <PaletteItem
                key={item.label}
                item={item}
                onSelect={() => navigate(item.href!)}
              />
            ))}
          </PaletteGroup>

          <PaletteGroup label="Quick links">
            {quickItems.map((item) => (
              <PaletteItem
                key={item.label}
                item={item}
                onSelect={() => navigate(item.href!)}
              />
            ))}
          </PaletteGroup>

          <PaletteGroup label="Account">
            <PaletteItem
              item={{
                label: "My account",
                description: "Seller dashboard, sales, messages",
                icon: UserCog,
                group: "Account",
              }}
              onSelect={() => navigate("/account")}
            />
            <PaletteItem
              item={{
                label: "Seller verifications",
                description: "Approve or reject pending sellers",
                icon: Shield,
                group: "Account",
              }}
              onSelect={() => navigate("/admin/seller-verifications")}
            />
            <PaletteItem
              item={{
                label: "Sign out (admin)",
                description: "End your admin session",
                icon: LogOut,
                group: "Account",
              }}
              onSelect={signOut}
            />
          </PaletteGroup>
        </Command.List>

        <PaletteFooter />
      </Command>
    </PaletteShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function PaletteShell({
  children,
  onClose,
  toast,
}: {
  children: React.ReactNode;
  onClose: () => void;
  toast?: Toast;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-surface-900/40 p-4 pt-[10vh] backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-surface-200 bg-surface-0 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`mx-2 mb-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold animate-fade-in ${
              toast.kind === "ok"
                ? "border-success-200 bg-success-50 text-success-700"
                : "border-error-200 bg-error-50 text-error-700"
            }`}
          >
            {toast.kind === "ok" ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{toast.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PaletteGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Command.Group
      heading={label}
      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-surface-500"
    >
      {children}
    </Command.Group>
  );
}

function PaletteItem({
  item,
  onSelect,
}: {
  item: Item;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <Command.Item
      value={`${item.label} ${item.description ?? ""} ${item.group}`}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-surface-700 aria-selected:bg-brand-50 aria-selected:text-brand-800"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-100 text-surface-600 aria-selected:bg-brand-100 aria-selected:text-brand-700">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.description && (
        <span className="hidden truncate text-xs text-surface-500 sm:inline">
          {item.description}
        </span>
      )}
    </Command.Item>
  );
}

function PaletteFooter() {
  return (
    <footer className="flex items-center justify-between gap-4 border-t border-surface-200 bg-surface-50 px-4 py-2 text-[10px] uppercase tracking-wider text-surface-500">
      <span className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-surface-200 bg-surface-0 px-1 font-mono font-semibold">↑↓</kbd>
          navigate
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-surface-200 bg-surface-0 px-1 font-mono font-semibold">↵</kbd>
          select
        </span>
      </span>
      <span className="inline-flex items-center gap-1">
        <Command className="h-3 w-3" aria-hidden="true" />
        GarageRoute Admin
      </span>
    </footer>
  );
}

/* ── Actions view (one sale picked) ─────────────────────────────────── */

type ActionRow = {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  destructive?: boolean;
  onSelect: () => void | Promise<void>;
};

function ActionsView({
  sale,
  busy,
  toast,
  onBack,
  onOpen,
  onToggleVerify,
  onCopyId,
  onCopyToken,
  onCopyUrl,
  onDelete,
}: {
  sale: SaleSummary;
  busy: boolean;
  toast: Toast;
  onBack: () => void;
  onOpen: () => void;
  onToggleVerify: () => void;
  onCopyId: () => void;
  onCopyToken: () => void;
  onCopyUrl: () => void;
  onDelete: () => void;
}) {
  const [active, setActive] = useState(0);
  const rowsRef = useRef<HTMLButtonElement[]>([]);

  const rows: ActionRow[] = [
    { id: "open",   label: "Open sale",         description: "View & edit listing",          icon: ExternalLink, onSelect: onOpen },
    {
      id: "verify",
      label: sale.verified ? "Remove verification" : "Verify listing",
      description: sale.verified ? "Mark as pending review" : "Approve and show verified badge",
      icon: sale.verified ? ShieldOff : ShieldCheck,
      onSelect: onToggleVerify,
    },
    { id: "copyId",     label: "Copy sale ID",       description: sale.id,                                          icon: Hash,     onSelect: onCopyId },
    { id: "copyPublic", label: "Copy public URL",    description: `garageroute.com/sales/${sale.id.slice(0, 8)}…`, icon: Link2,    onSelect: onCopyUrl },
    { id: "copyManage", label: "Copy seller link",   description: sale.sellerToken ? `garageroute.com/manage/${sale.sellerToken.slice(0, 8)}…` : "—", icon: KeyRound, onSelect: onCopyToken },
    { id: "delete",     label: "Delete sale",        description: "Removes listing, items, messages",                icon: Trash2, destructive: true, onSelect: onDelete },
  ];

  // Reset active row + focus when sale changes
  useEffect(() => {
    setActive(0);
     
  }, [sale.id]);

  // Focus the active row whenever active or rows length change
  useEffect(() => {
    if (active >= rows.length) setActive(rows.length - 1);
    rowsRef.current[active]?.focus();
     
  }, [active, rows.length]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (row && !busy) void row.onSelect();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <div onKeyDown={onKey}>
      <header className="flex items-center justify-between gap-3 border-b border-surface-200 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-700"
            aria-label="Back to search"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
              Sale actions
            </p>
            <p className="truncate text-sm font-semibold text-surface-900">{sale.title}</p>
            <p className="truncate text-xs text-surface-500">
              {sale.seller} · {sale.city}, {sale.state}
            </p>
          </div>
        </div>
        {sale.verified ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Verified
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-semibold text-warning-700">
            Pending
          </span>
        )}
      </header>

      <ul className="max-h-[55vh] overflow-y-auto scroll-y p-2">
        {rows.map((row, i) => {
          const Icon = row.icon;
          const isActive = i === active;
          return (
            <li key={row.id}>
              <button
                ref={(el) => {
                  if (el) rowsRef.current[i] = el;
                }}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => !busy && void row.onSelect()}
                disabled={busy}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition aria-selected:bg-brand-50 ${
                  isActive ? "bg-brand-50 text-brand-800" : "text-surface-700 hover:bg-surface-50"
                } ${row.destructive ? "data-[destructive=true]" : ""}`}
                data-destructive={row.destructive || undefined}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                    row.destructive
                      ? "bg-error-50 text-error-600"
                      : isActive
                      ? "bg-brand-100 text-brand-700"
                      : "bg-surface-100 text-surface-600"
                  }`}
                >
                  {busy && i === 1 ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block truncate font-medium ${row.destructive ? "text-error-700" : ""}`}>
                    {row.label}
                  </span>
                  {row.description && (
                    <span className="block truncate text-xs text-surface-500">{row.description}</span>
                  )}
                </span>
                {isActive && (
                  <kbd className="rounded border border-surface-200 bg-surface-0 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-surface-500">
                    ↵
                  </kbd>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`mx-2 mb-2 flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold animate-fade-in ${
            toast.kind === "ok"
              ? "border-success-200 bg-success-50 text-success-700"
              : "border-error-200 bg-error-50 text-error-700"
          }`}
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      <PaletteFooter />
    </div>
  );
}

/* ── Confirm view (destructive action) ──────────────────────────────── */

function ConfirmView({
  sale,
  busy,
  onCancel,
  onConfirm,
}: {
  sale: SaleSummary;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div onKeyDown={onKey}>
      <header className="flex items-start gap-3 border-b border-surface-200 px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-error-50 text-error-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-error-600">
            Confirm delete
          </p>
          <p className="mt-0.5 text-sm font-semibold text-surface-900">
            Delete &ldquo;{sale.title}&rdquo;?
          </p>
          <p className="mt-1 text-xs text-surface-600">
            This permanently removes the listing, all items, queues, messages, and reservations. The audit log entry remains.
          </p>
        </div>
      </header>

      <div className="flex items-center justify-end gap-2 border-t border-surface-200 bg-surface-50 px-4 py-3">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="btn btn-secondary btn-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void onConfirm()}
          disabled={busy}
          className="btn btn-danger btn-sm"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete sale
        </button>
      </div>
    </div>
  );
}
