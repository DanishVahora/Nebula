import { useEffect, useState } from "react";
import { classroomAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy } from "lucide-react";
import { LeaderboardRow } from "./LeaderboardRow";

interface Props {
  classroomId: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalScore: number;
  completedAssignments: number;
  averageScore: number;
}

export function LeaderboardPanel({ classroomId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await classroomAPI.getLeaderboard(classroomId);
        if (!active) return;
        setLeaderboard(data.leaderboard || []);
      } catch {
        if (!active) return;
        setLeaderboard([]);
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

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h3 className="text-sm font-semibold">Classroom Leaderboard</h3>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-sm text-zinc-500">No ranking data yet. Scores will appear once students submit assignments.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-left text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2">Rank</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Total Score</th>
                <th className="px-3 py-2">Assignments Completed</th>
                <th className="px-3 py-2">Average Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  isCurrentUser={entry.userId === user?.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
