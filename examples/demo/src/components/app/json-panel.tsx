type JsonPanelProps = {
  title: string;
  value: unknown;
};

export function JsonPanel({ title, value }: JsonPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-950 px-4 py-3 text-slate-100 shadow-sm">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
        {title}
      </h3>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
