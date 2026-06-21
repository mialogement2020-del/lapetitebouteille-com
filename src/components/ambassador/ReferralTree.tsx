import { useState } from "react";
import { motion } from "framer-motion";
import { User, Users, Crown, Award, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Referral } from "@/hooks/useAmbassador";
import { useTranslation } from "react-i18next";

interface ReferralTreeProps {
  referrals: Referral[];
  isLoading: boolean;
}

export function ReferralTree({ referrals, isLoading }: ReferralTreeProps) {
  const { t, i18n } = useTranslation("referralTree");
  const dateFnsLocale = i18n.language === "en" ? enUS : fr;

  const RANK_CONFIG: Record<string, { label: string; color: string; icon: typeof Award }> = {
    bronze: { label: t("rank.bronze"), color: "#CD7F32", icon: Award },
    silver: { label: t("rank.silver"), color: "#C0C0C0", icon: Award },
    gold: { label: t("rank.gold"), color: "#FFD700", icon: Crown },
    diamond: { label: t("rank.diamond"), color: "#B9F2FF", icon: Crown },
    elite: { label: t("rank.elite"), color: "#E5E4E2", icon: Crown },
  };

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["level-1", "level-2", "level-3"]));

  const level1 = referrals.filter((r) => r.level === 1);
  const level2 = referrals.filter((r) => r.level === 2);
  const level3 = referrals.filter((r) => r.level === 3);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const f = firstName?.charAt(0) || "";
    const l = lastName?.charAt(0) || "";
    return (f + l).toUpperCase() || "?";
  };

  const getName = (profile?: { first_name?: string | null; last_name?: string | null }) => {
    if (!profile?.first_name && !profile?.last_name) return t("unknownUser");
    return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-12">
        <div className="w-16 h-16 rounded-full bg-noir-light/50 animate-pulse mb-4" />
        <div className="h-8 w-0.5 bg-noir-light/50 animate-pulse" />
        <div className="flex gap-8 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-noir-light/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (referrals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Crown className="h-10 w-10 text-noir" />
          </div>
          <p className="text-cream font-medium mb-2">{t("you")}</p>
        </div>
        
        <div className="w-0.5 h-8 bg-gold/30 mx-auto" />
        
        <div className="mt-4 p-6 rounded-xl border-2 border-dashed border-gold/20 bg-noir-light/20">
          <Users className="h-12 w-12 text-cream/20 mx-auto mb-4" />
          <p className="text-cream/60">{t("noReferrals")}</p>
          <p className="text-cream/40 text-sm mt-1">
            {t("inviteHint")}
          </p>
        </div>
      </div>
    );
  }

  const ReferralNode = ({ referral, isLast }: { referral: Referral; isLast: boolean }) => {
    const rankConfig = RANK_CONFIG[referral.rank || "bronze"];
    const RankIcon = rankConfig?.icon || Award;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center relative"
      >
        <div 
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2"
          style={{ 
            borderColor: rankConfig?.color,
            background: `linear-gradient(135deg, ${rankConfig?.color}20, ${rankConfig?.color}10)`
          }}
        >
          {referral.profile?.avatar_url ? (
            <img
              src={referral.profile.avatar_url}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span 
              className="font-bold text-sm"
              style={{ color: rankConfig?.color }}
            >
              {getInitials(referral.profile?.first_name, referral.profile?.last_name)}
            </span>
          )}
          
          <div 
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: rankConfig?.color }}
          >
            <RankIcon className="h-3 w-3 text-noir" />
          </div>
        </div>
        
        <p className="text-cream text-xs font-medium mt-2 text-center max-w-[80px] truncate">
          {getName(referral.profile)}
        </p>
        <span 
          className="text-[10px] px-1.5 py-0.5 rounded-full mt-1"
          style={{ 
            backgroundColor: `${rankConfig?.color}20`,
            color: rankConfig?.color 
          }}
        >
          {rankConfig?.label}
        </span>
      </motion.div>
    );
  };

  const LevelRow = ({ 
    level, 
    referralsList, 
    title, 
    commission,
    levelColor 
  }: { 
    level: number; 
    referralsList: Referral[]; 
    title: string; 
    commission: string;
    levelColor: string;
  }) => {
    const isExpanded = expandedNodes.has(`level-${level}`);
    const displayReferrals = referralsList.slice(0, 5);
    const remainingCount = referralsList.length - 5;

    return (
      <Collapsible 
        open={isExpanded} 
        onOpenChange={() => toggleNode(`level-${level}`)}
        className="w-full"
      >
        <div className="relative">
          {level > 1 && (
            <div className="absolute left-1/2 -top-6 w-0.5 h-6 bg-gradient-to-b from-gold/50 to-gold/20" />
          )}
          
          <CollapsibleTrigger className="w-full">
            <div 
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all",
                "hover:border-gold/40 cursor-pointer",
                isExpanded ? "bg-noir-light/50 border-gold/30" : "bg-noir-light/20 border-gold/10"
              )}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${levelColor}20` }}
                >
                  <span className="font-bold" style={{ color: levelColor }}>{level}</span>
                </div>
                <div className="text-left">
                  <h4 className="text-cream font-medium text-sm">{title}</h4>
                  <p className="text-cream/50 text-xs">
                    {t("referralCount", { count: referralsList.length })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-primary text-sm font-medium">{commission}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-cream/50" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-cream/50" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {referralsList.length > 0 ? (
              <div className="relative pt-6 pb-4">
                {displayReferrals.length > 1 && (
                  <div 
                    className="absolute top-6 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-transparent via-gold/30 to-transparent"
                    style={{ width: `${Math.min(displayReferrals.length * 20, 80)}%` }}
                  />
                )}
                
                <div className="flex justify-center gap-4 md:gap-8 flex-wrap">
                  {displayReferrals.map((referral, index) => (
                    <div key={referral.id} className="relative">
                      <div className="absolute left-1/2 -top-3 w-0.5 h-3 bg-gold/30" />
                      <ReferralNode 
                        referral={referral} 
                        isLast={index === displayReferrals.length - 1} 
                      />
                    </div>
                  ))}
                  
                  {remainingCount > 0 && (
                    <div className="relative">
                      <div className="absolute left-1/2 -top-3 w-0.5 h-3 bg-gold/30" />
                      <div className="w-14 h-14 rounded-full bg-noir-light/50 border-2 border-dashed border-gold/20 flex items-center justify-center">
                        <span className="text-cream/60 text-xs font-medium">+{remainingCount}</span>
                      </div>
                      <p className="text-cream/40 text-xs mt-2 text-center">{t("others")}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-gold/20 flex items-center justify-center mx-auto">
                  <User className="h-5 w-5 text-cream/20" />
                </div>
                <p className="text-cream/40 text-xs mt-2">{t("noReferralAtLevel")}</p>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="relative"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center shadow-xl">
            <Crown className="h-10 w-10 text-noir" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-noir">
            <span className="text-noir text-xs font-bold">★</span>
          </div>
        </motion.div>
        <p className="text-cream font-display text-lg mt-3">{t("you")}</p>
        <p className="text-primary text-sm">{t("ambassador")}</p>
        
        <div className="w-0.5 h-8 bg-gradient-to-b from-gold to-gold/20 mt-4" />
      </div>

      <div className="space-y-6">
        <LevelRow 
          level={1} 
          referralsList={level1} 
          title={t("level1Title")}
          commission="8%"
          levelColor="#FFD700"
        />
        
        {level1.length > 0 && (
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-gradient-to-b from-gold/30 to-gold/10" />
          </div>
        )}
        
        <LevelRow 
          level={2} 
          referralsList={level2} 
          title={t("level2Title")}
          commission="4%"
          levelColor="#C0C0C0"
        />
        
        {level2.length > 0 && (
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-gradient-to-b from-gold/20 to-gold/5" />
          </div>
        )}
        
        <LevelRow 
          level={3} 
          referralsList={level3} 
          title={t("level3Title")}
          commission="2%"
          levelColor="#CD7F32"
        />
      </div>

      <div className="mt-8 pt-6 border-t border-gold/10">
        <p className="text-cream/50 text-xs mb-3">{t("legendTitle")}</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RANK_CONFIG).map(([key, config]) => (
            <div 
              key={key}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
              style={{ backgroundColor: `${config.color}15` }}
            >
              <config.icon className="h-3 w-3" style={{ color: config.color }} />
              <span style={{ color: config.color }}>{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
