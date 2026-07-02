type MonthlyVersesChartProps = {
  data: Array<{ month: string; count: number }>;
};

export default function MonthlyVersesChart({ data }: MonthlyVersesChartProps) {
  const maxValue = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-sage-700">Monthly rhythm</p>
          <p className="text-sm text-sage-600">Verses shared over time</p>
        </div>
      </div>

      <div className="mt-5 flex items-end gap-2 overflow-x-auto pb-2">
        {data.map((item) => {
          const height = Math.max((item.count / maxValue) * 100, 10);

          return (
            <div key={item.month} className="flex min-w-[44px] flex-1 flex-col items-center">
              <div className="flex h-40 w-full items-end rounded-2xl bg-sage-50 p-1">
                <div
                  className="w-full rounded-xl bg-gradient-to-t from-rose-500 to-sage-500"
                  style={{ height: `${height}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] font-medium text-sage-600">{item.month}</p>
              <p className="text-[11px] text-sage-500">{item.count}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
