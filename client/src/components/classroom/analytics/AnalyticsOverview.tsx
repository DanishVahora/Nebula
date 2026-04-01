import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { classroomAPI } from "@/lib/api";
import { Users, FileCode2, Sigma, CheckCircle2 } from "lucide-react";
import { AssignmentPerformanceChart } from "./AssignmentPerformanceChart";

interface Props {
  classroomId: string;
}

interface AssignmentPerformance {
  assignmentId: string;
  assignmentTitle: string;
  averageScore: number;
  completionRate: number;
}

interface AnalyticsData {
  totalStudents: number;
  totalAssignments: number;
  averageScore: number;
  completionRate: number;
  assignments: AssignmentPerformance[];
}

const defaultData: AnalyticsData = {
  totalStudents: 0,
  totalAssignments: 0,
  averageScore: 0,
  completionRate: 0,
  assignments: [],
};

export function AnalyticsOverview({ classroomId }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>(defaultData);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data } = await classroomAPI.getAnalytics(classroomId);
        if (!active) return;
        setData(data);
      } catch {
        if (!active) return;
        setData(defaultData);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [classroomId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-yellow-500" />
      </div>
    );
  }

  const cards = [
    {
      label: "Total Students",
      value: data.totalStudents,
      icon: Users,
    },
    {
      label: "Total Assignments",
      value: data.totalAssignments,
      icon: FileCode2,
    },
    {
      label: "Average Score",
      value: data.averageScore.toFixed(2),
      icon: Sigma,
    },
    {
      label: "Completion Rate",
      value: `${data.completionRate.toFixed(2)}%`,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.04 }}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-zinc-400">
              <card.icon className="h-4 w-4" />
              <p className="text-[11px] uppercase tracking-wide">{card.label}</p>
            </div>
            <p className="text-xl font-semibold text-zinc-100">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <AssignmentPerformanceChart assignments={data.assignments} />
    </div>
  );
}
