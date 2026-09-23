const PageLoadingIndicator = ({ label = "Loading page" }) => (
  <div
    className="min-h-[calc(100vh-8rem)] w-full px-1 py-2 sm:px-2"
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <div
      className="mx-auto flex w-full max-w-[1600px] flex-col gap-6"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="os-skeleton h-7 w-44 sm:w-56" />
          <div className="os-skeleton h-4 w-64 max-w-[78vw] sm:w-80" />
        </div>
        <div className="os-skeleton h-10 w-32 self-start" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
          <div className="os-skeleton mb-5 h-4 w-28" />
          <div className="os-skeleton h-8 w-20" />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
          <div className="os-skeleton mb-5 h-4 w-36" />
          <div className="os-skeleton h-8 w-24" />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:col-span-2 xl:col-span-1">
          <div className="os-skeleton mb-5 h-4 w-24" />
          <div className="os-skeleton h-8 w-16" />
        </div>
      </div>

      <div className="grid min-h-72 gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="os-skeleton h-5 w-40" />
            <div className="os-skeleton h-9 w-24" />
          </div>
          <div className="space-y-4">
            <div className="os-skeleton h-12 w-full" />
            <div className="os-skeleton h-12 w-full" />
            <div className="os-skeleton h-12 w-[92%]" />
            <div className="os-skeleton h-12 w-[96%]" />
          </div>
        </div>

        <div className="hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 xl:block">
          <div className="os-skeleton mb-6 h-5 w-32" />
          <div className="space-y-4">
            <div className="os-skeleton h-16 w-full" />
            <div className="os-skeleton h-16 w-full" />
            <div className="os-skeleton h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
    <span className="sr-only">{label}</span>
  </div>
);

export default PageLoadingIndicator;
