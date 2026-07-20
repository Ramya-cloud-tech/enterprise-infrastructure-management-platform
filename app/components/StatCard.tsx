type StatCardProps = {
  title: string;
  value: number;
};

export default function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">

      <p className="text-slate-500 text-sm">
        {title}
      </p>

      <h2 className="mt-3 text-4xl font-bold text-slate-900">
        {value}
      </h2>

    </div>
  );
}