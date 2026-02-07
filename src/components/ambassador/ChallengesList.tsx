import { useState } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Clock,
  Trophy,
  Users,
  TrendingUp,
  CheckCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useActiveChallenges, useMyChallenges, useJoinChallenge, Challenge } from "@/hooks/useChallenges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatPrice } from "@/lib/utils";

const challengeTypeIcons: Record<string, React.ReactNode> = {
  referrals: <Users className="h-5 w-5" />,
  sales: <TrendingUp className="h-5 w-5" />,
  signups: <Users className="h-5 w-5" />,
  orders: <Target className="h-5 w-5" />,
};

const challengeTypeLabels: Record<string, string> = {
  referrals: "Parrainages",
  sales: "Ventes",
  signups: "Inscriptions",
  orders: "Commandes",
};

function formatTimeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Terminé";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}j ${hours}h`;
  return `${hours}h`;
}

interface ChallengeCardProps {
  challenge: Challenge;
  participation?: {
    current_progress: number;
    is_completed: boolean;
    bonus_claimed: boolean;
  };
  onJoin?: () => void;
  isJoining?: boolean;
}

function ChallengeCard({ challenge, participation, onJoin, isJoining }: ChallengeCardProps) {
  const progressPercent = participation
    ? Math.min((participation.current_progress / challenge.target_value) * 100, 100)
    : 0;

  const isCompleted = participation?.is_completed;
  const hasJoined = !!participation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-5 ${
        isCompleted
          ? "bg-success/10 border-success/30"
          : "bg-noir-light/30 border-gold/10"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: challenge.badge_color || "#D4AF37" + "20" }}
          >
            <span
              className="text-lg"
              style={{ color: challenge.badge_color || "#D4AF37" }}
            >
              {challengeTypeIcons[challenge.challenge_type] || <Target className="h-5 w-5" />}
            </span>
          </div>
          <div>
            <h4 className="text-cream font-medium">{challenge.title}</h4>
            <Badge variant="outline" className="text-xs border-gold/30 text-cream/60">
              {challengeTypeLabels[challenge.challenge_type] || challenge.challenge_type}
            </Badge>
          </div>
        </div>
        
        {isCompleted && (
          <Badge className="bg-success/20 text-success border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        )}
      </div>

      {/* Description */}
      {challenge.description && (
        <p className="text-sm text-cream/70 mb-4">{challenge.description}</p>
      )}

      {/* Progress */}
      {hasJoined && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-cream/60">Progression</span>
            <span className="text-cream font-medium">
              {participation.current_progress} / {challenge.target_value}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-cream/60">
            <Clock className="h-4 w-4" />
            <span>{formatTimeLeft(challenge.ends_at)}</span>
          </div>
          <div className="flex items-center gap-1 text-primary font-semibold">
            <Trophy className="h-4 w-4" />
            <span>{formatPrice(challenge.bonus_amount)}</span>
          </div>
        </div>

        {!hasJoined && onJoin && (
          <Button
            size="sm"
            onClick={onJoin}
            disabled={isJoining}
            className="bg-primary hover:bg-primary/90 text-noir"
          >
            {isJoining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Participer
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export function ChallengesList() {
  const { data: activeChallenges, isLoading: loadingActive } = useActiveChallenges();
  const { data: myChallenges, isLoading: loadingMine } = useMyChallenges();
  const joinChallenge = useJoinChallenge();

  const isLoading = loadingActive || loadingMine;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-noir-light/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!activeChallenges?.length) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-cream/20 mx-auto mb-4" />
        <p className="text-cream/60">
          Aucun challenge actif pour le moment. Revenez bientôt !
        </p>
      </div>
    );
  }

  // Map participations by challenge ID
  const participationMap = new Map(
    myChallenges?.map((p) => [p.challenge_id, p]) || []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
          <Target className="h-5 w-5 text-noir" />
        </div>
        <div>
          <h3 className="font-display text-xl text-cream">Challenges Actifs</h3>
          <p className="text-sm text-cream/60">
            Relevez des défis pour gagner des bonus
          </p>
        </div>
      </div>

      {activeChallenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          participation={participationMap.get(challenge.id)}
          onJoin={() => joinChallenge.mutate(challenge.id)}
          isJoining={joinChallenge.isPending}
        />
      ))}
    </div>
  );
}
