import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, Crown, Star, TrendingUp } from "lucide-react";
import { useMonthlyLeaderboard, LeaderboardEntry } from "@/hooks/useLeaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";

const rankIcons: Record<number, React.ReactNode> = {
  1: <Crown className="h-6 w-6 text-yellow-400" />,
  2: <Medal className="h-6 w-6 text-gray-300" />,
  3: <Medal className="h-6 w-6 text-amber-600" />,
};

function LeaderboardRow({
  entry,
  index,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  index: number;
  isCurrentUser: boolean;
}) {
  const displayName =
    entry.first_name || entry.last_name
      ? `${entry.first_name || ""} ${entry.last_name || ""}`.trim()
      : "Ambassadeur";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-4 p-4 rounded-xl ${
        isCurrentUser
          ? "bg-primary/20 border border-primary/30"
          : index < 3
          ? "bg-noir-light/50"
          : "bg-noir-light/30"
      } ${index < 3 ? "border border-gold/20" : ""}`}
    >
      {/* Rank */}
      <div className="w-12 flex-shrink-0 flex items-center justify-center">
        {rankIcons[entry.rank_position] || (
          <span className="text-xl font-bold text-cream/60">
            {entry.rank_position}
          </span>
        )}
      </div>

      {/* Avatar & Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10 border-2" style={{ borderColor: entry.badge_color || "#CD7F32" }}>
          <AvatarImage src={entry.avatar_url || undefined} />
          <AvatarFallback className="bg-noir-light text-cream">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-cream font-medium truncate">
            {displayName}
            {isCurrentUser && (
              <span className="ml-2 text-xs text-primary">(vous)</span>
            )}
          </p>
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              borderColor: entry.badge_color || "#CD7F32",
              color: entry.badge_color || "#CD7F32",
            }}
          >
            {entry.current_rank || "Bronze"}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6 text-right">
        <div>
          <p className="text-xs text-cream/60">Parrainages</p>
          <p className="text-cream font-medium">{entry.new_referrals}</p>
        </div>
        <div>
          <p className="text-xs text-cream/60">Commandes</p>
          <p className="text-cream font-medium">{entry.monthly_orders}</p>
        </div>
      </div>

      {/* Earnings */}
      <div className="text-right">
        <p className="text-primary font-bold">
          {formatPrice(entry.monthly_earnings)}
        </p>
        <p className="text-xs text-cream/60">ce mois</p>
      </div>
    </motion.div>
  );
}

export function MonthlyLeaderboard({ currentUserId }: { currentUserId?: string }) {
  const { data: leaderboard, isLoading } = useMonthlyLeaderboard();
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full bg-noir-light/50" />
        ))}
      </div>
    );
  }

  if (!leaderboard?.length) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-cream/20 mx-auto mb-4" />
        <p className="text-cream/60">
          Pas encore de classement ce mois-ci. Soyez le premier !
        </p>
      </div>
    );
  }

  const displayedEntries = showAll ? leaderboard : leaderboard.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
            <Trophy className="h-5 w-5 text-noir" />
          </div>
          <div>
            <h3 className="font-display text-xl text-cream">Leaderboard Mensuel</h3>
            <p className="text-sm text-cream/60">
              {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-success text-sm">
          <TrendingUp className="h-4 w-4" />
          <span>En direct</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        {displayedEntries.map((entry, index) => (
          <LeaderboardRow
            key={entry.user_id}
            entry={entry}
            index={index}
            isCurrentUser={entry.user_id === currentUserId}
          />
        ))}
      </div>

      {/* Show more */}
      {leaderboard.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center py-3 text-primary hover:text-primary/80 transition-colors text-sm"
        >
          {showAll ? "Voir moins" : `Voir les ${leaderboard.length - 10} autres`}
        </button>
      )}
    </div>
  );
}
