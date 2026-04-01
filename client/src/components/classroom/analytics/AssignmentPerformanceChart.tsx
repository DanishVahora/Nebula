import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AssignmentPerformance {
  assignmentId: string;
  assignmentTitle: string;
  averageScore: number;
  completionRate: number;
}

interface Props {
  assignments: AssignmentPerformance[];
}

export function AssignmentPerformanceChart({ assignments }: Props) {
  const data = assignments.map((a) => ({
    id: a.assignmentId,
    title: a.assignmentTitle.length > 18 ? `${a.assignmentTitle.slice(0, 18)}...` : a.assignmentTitle,
    averageScore: a.averageScore,
    completionRate: a.completionRate,
  }));

  if (!data.length) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h4 className="mb-2 text-sm font-semibold">Assignment Performance</h4>
        <p className="text-sm text-zinc-500">No assignments available yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h4 className="mb-4 text-sm font-semibold">Assignment Performance</h4>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
            <XAxis
              dataKey="title"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              axisLine={{ stroke: "#3f3f46" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              axisLine={{ stroke: "#3f3f46" }}
              tickLine={false}
              domain={[0, 100]}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "#0f0f11",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                color: "#e4e4e7",
              }}
            />
            <Bar dataKey="averageScore" fill="#eab308" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
