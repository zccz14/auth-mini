type JsonPanelProps = {
  title: string;
  value: unknown;
};

export function JsonPanel({ title, value }: JsonPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-sm text-slate-100">
      <h3 className="mb-3 font-medium">{title}</h3>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
