// Passthrough root layout for /admin — child groups provide their own UI:
//   /admin/login            — public, no shell
//   /admin/(app)/...        — protected, uses AdminShell via (app)/layout.tsx
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
