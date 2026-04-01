import { Medal } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalScore: number;
  completedAssignments: number;
  averageScore: number;
}

interface Props {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="h-4 w-4 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-zinc-300" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-700" />;
  return <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/5 px-1.5 text-[11px]">{rank}</span>;
}

export function LeaderboardRow({ entry, isCurrentUser }: Props) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={isCurrentUser ? "bg-yellow-500/10" : "hover:bg-white/[0.03]"}
    >
      <td className="px-3 py-3 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <RankIcon rank={entry.rank} />
          <span>#{entry.rank}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-sm font-medium text-zinc-100">
        {entry.name}
        {isCurrentUser && <span className="ml-2 rounded-md bg-yellow-500/15 px-1.5 py-0.5 text-[10px] text-yellow-300">You</span>}
      </td>
      <td className="px-3 py-3 text-sm text-zinc-300">{entry.totalScore}</td>
      <td className="px-3 py-3 text-sm text-zinc-300">{entry.completedAssignments}</td>
      <td className="px-3 py-3 text-sm text-zinc-300">{entry.averageScore.toFixed(2)}</td>
    </motion.tr>
  );
}
