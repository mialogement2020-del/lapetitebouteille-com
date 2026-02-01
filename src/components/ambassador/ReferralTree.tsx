import { motion } from "framer-motion";
import { User, Users, Crown, Award, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Referral } from "@/hooks/useAmbassador";

interface ReferralTreeProps {
  referrals: Referral[];
  isLoading: boolean;
}

const RANK_CONFIG: Record<string, { label: string; color: string; icon: typeof Award }> = {
  bronze: { label: "Bronze", color: "#CD7F32", icon: Award },
  silver: { label: "Argent", color: "#C0C0C0", icon: Award },
  gold: { label: "Or", color: "#FFD700", icon: Crown },
  diamond: { label: "Diamant", color: "#B9F2FF", icon: Crown },
  elite: { label: "Élite", color: "#E5E4E2", icon: Crown },
};

export function ReferralTree({ referrals, isLoading }: ReferralTreeProps) {
  // Group referrals by level
  const level1 = referrals.filter((r) => r.level === 1);
  const level2 = referrals.filter((r) => r.level === 2);
  const level3 = referrals.filter((r) => r.level === 3);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const f = firstName?.charAt(0) || "";
    const l = lastName?.charAt(0) || "";
    return (f + l).toUpperCase() || "?";
  };

  const getName = (profile?: { first_name?: string | null; last_name?: string | null }) => {
    if (!profile?.first_name && !profile?.last_name) return "Utilisateur";
    return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 w-32 bg-noir-light/50 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="h-20 bg-noir-light/50 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (referrals.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-cream/20 mx-auto mb-4" />
        <p className="text-cream/60">Aucun filleul pour le moment</p>
        <p className="text-cream/40 text-sm mt-1">
          Invitez vos amis avec votre code de parrainage
        </p>
      </div>
    );
  }

  const ReferralCard = ({ referral, index }: { referral: Referral; index: number }) => {
    const rankConfig = RANK_CONFIG[referral.rank || "bronze"];
    const RankIcon = rankConfig?.icon || Award;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex items-center gap-3 p-4 rounded-lg bg-noir-light/30 border border-gold/10 hover:border-gold/20 transition-colors"
      >
        {/* Avatar */}
        {referral.profile?.avatar_url ? (
          <img
            src={referral.profile.avatar_url}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-medium text-sm">
              {getInitials(referral.profile?.first_name, referral.profile?.last_name)}
            </span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-cream font-medium truncate">
            {getName(referral.profile)}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${rankConfig?.color}20` }}
            >
              <RankIcon className="h-3 w-3" style={{ color: rankConfig?.color }} />
              <span style={{ color: rankConfig?.color }}>{rankConfig?.label}</span>
            </div>
            <span className="text-cream/40">
              {format(new Date(referral.created_at), "MMM yyyy", { locale: fr })}
            </span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-cream/30" />
      </motion.div>
    );
  };

  const LevelSection = ({ level, referralsList, title, commission }: { 
    level: number; 
    referralsList: Referral[]; 
    title: string; 
    commission: string;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">{level}</span>
          </div>
          <div>
            <h4 className="text-cream font-medium">{title}</h4>
            <p className="text-cream/50 text-xs">{referralsList.length} filleul(s)</p>
          </div>
        </div>
        <span className="text-primary text-sm font-medium">{commission}</span>
      </div>
      
      {referralsList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10">
          {referralsList.slice(0, 6).map((referral, index) => (
            <ReferralCard key={referral.id} referral={referral} index={index} />
          ))}
          {referralsList.length > 6 && (
            <div className="flex items-center justify-center p-4 rounded-lg border border-dashed border-gold/20 text-cream/50 text-sm">
              +{referralsList.length - 6} autres filleuls
            </div>
          )}
        </div>
      ) : (
        <div className="pl-10">
          <div className="p-4 rounded-lg border border-dashed border-gold/10 text-center text-cream/40 text-sm">
            Aucun filleul à ce niveau
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <LevelSection level={1} referralsList={level1} title="Niveau 1 - Directs" commission="8% de commission" />
      <LevelSection level={2} referralsList={level2} title="Niveau 2" commission="4% de commission" />
      <LevelSection level={3} referralsList={level3} title="Niveau 3" commission="2% de commission" />
    </div>
  );
}
