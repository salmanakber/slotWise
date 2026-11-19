export default function DashboardLoading() {
  return (
    <div className="grid gap-3.5" aria-busy="true" aria-label="Loading">
      <div className="sw-card h-16 animate-pulse !bg-[var(--sf)]" />
      <div className="sw-card h-72 animate-pulse !bg-[var(--sf)]" />
    </div>
  );
}
