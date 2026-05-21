import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  TrendingUp,
  ArrowLeft,
  Settings,
  Trophy,
  Target,
  Calculator,
  ImageIcon
} from "lucide-react";
import { AmbassadorNotifications } from "@/components/ambassador/AmbassadorNotifications";
import { PushNotificationSettings } from "@/components/ambassador/PushNotificationSettings";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { 
  useAmbassadorStats, 
  useCommissions, 
  useReferrals, 
  useWalletTransactions,
  useReferralCode
} from "@/hooks/useAmbassador";
import { StatsOverview } from "@/components/ambassador/StatsOverview";
import { CommissionHistory } from "@/components/ambassador/CommissionHistory";
import { ReferralTree } from "@/components/ambassador/ReferralTree";
import { WalletManager } from "@/components/ambassador/WalletManager";
import { ReferralLink } from "@/components/ambassador/ReferralLink";
import { LinkStats } from "@/components/ambassador/LinkStats";
import { ShortLinkManager } from "@/components/ambassador/ShortLinkManager";
import { MonthlyLeaderboard } from "@/components/ambassador/MonthlyLeaderboard";
import { ChallengesList } from "@/components/ambassador/ChallengesList";
import { IncomeSimulator } from "@/components/ambassador/IncomeSimulator";
import { ShareableAssetsLibrary } from "@/components/ambassador/ShareableAssetsLibrary";
import { useTranslation } from "react-i18next";

export default function Ambassadeur() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuthContext();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAmbassadorStats();
  const { data: commissions, isLoading: commissionsLoading } = useCommissions();
  const { data: referrals, isLoading: referralsLoading } = useReferrals();
  const { data: transactions, isLoading: transactionsLoading } = useWalletTransactions();
  const { data: referralCode, isLoading: referralCodeLoading } = useReferralCode();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/connexion?redirect=/ambassadeur");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-noir flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-noir">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-cream/60 hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("ambassador.backHome")}
          </Link>

          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center">
                <LayoutDashboard className="h-7 w-7 text-noir" />
              </div>
              <div>
                <h1 className="font-display text-3xl text-cream">{t("ambassador.title")}</h1>
                <p className="text-cream/60">{t("ambassador.subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AmbassadorNotifications />
              <Button variant="outline" className="border-gold/30 text-cream hover:bg-cream/10">
                <Settings className="h-4 w-4 mr-2" />
                {t("ambassador.settings")}
              </Button>
            </div>
          </motion.div>
          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Referral Link & Push Settings */}
            <div className="lg:col-span-1 order-2 lg:order-1 space-y-6">
              {referralCodeLoading ? (
                <div className="h-80 rounded-xl bg-noir-light/50 animate-pulse" />
              ) : referralCode ? (
                <ReferralLink
                  code={referralCode.code}
                  customCode={referralCode.custom_code}
                  stats={{
                    total_clicks: referralCode.total_clicks || 0,
                    total_signups: referralCode.total_signups || 0,
                    total_orders: referralCode.total_orders || 0,
                  }}
                />
              ) : null}
              
              {/* Short Link Manager */}
              <ShortLinkManager />
              
              {/* Push Notification Settings */}
              <PushNotificationSettings />
            </div>

            {/* Right Column - Dashboard Tabs */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-noir-light/50 border border-gold/10 p-1 w-full flex flex-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-gold/30 scrollbar-track-transparent !justify-start">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-primary data-[state=active]:text-noir flex-shrink-0"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    {t("ambassador.tabOverview")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="leaderboard"
                    className="data-[state=active]:bg-primary data-[state=active]:text-noir flex-shrink-0"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    {t("ambassador.tabLeaderboard")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="challenges"
                    className="data-[state=active]:bg-primary data-[state=active]:text-noir flex-shrink-0"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    {t("ambassador.tabChallenges")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="commissions"
                    className="data-[state=active]:bg-primary data-[state=active]:text-noir flex-shrink-0"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {t("ambassador.tabCommissions")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="network"
                    className="data-[state=active]:bg-primary data-[state=active]:text-noir flex-shrink-0"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {t("ambassador.tabNetwork")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="wallet"
                    className="data-[state=active]:bg-primary data-[state=active]:text-noir flex-shrink-0"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    {t("ambassador.tabWallet")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="simulator"
                    className="data-[state=active]:bg-primary data-[state=active]:text-noir flex-shrink-0"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {t("ambassador.tabSimulator")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="assets"
                    className="data-[state=active]:bg-primary data-[state=active]:text-noir flex-shrink-0"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {t("ambassador.tabAssets")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <StatsOverview 
                    stats={stats!} 
                    isLoading={statsLoading} 
                  />
                  
                  {/* Link Performance Stats */}
                  <div className="bg-noir-light/30 rounded-xl border border-gold/10 p-6">
                    <LinkStats />
                  </div>
                </TabsContent>

                <TabsContent value="leaderboard">
                  <div className="bg-noir-light/30 rounded-xl border border-gold/10 p-6">
                    <MonthlyLeaderboard currentUserId={user?.id} />
                  </div>
                </TabsContent>

                <TabsContent value="challenges">
                  <div className="bg-noir-light/30 rounded-xl border border-gold/10 p-6">
                    <ChallengesList />
                  </div>
                </TabsContent>

                <TabsContent value="commissions">
                  <div className="bg-noir-light/30 rounded-xl border border-gold/10 p-6">
                    <h3 className="font-display text-xl text-cream mb-6">
                      {t("ambassador.commissionsHistory")}
                    </h3>
                    <CommissionHistory
                      commissions={commissions || []}
                      isLoading={commissionsLoading}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="network">
                  <div className="bg-noir-light/30 rounded-xl border border-gold/10 p-6">
                    <h3 className="font-display text-xl text-cream mb-6">
                      {t("ambassador.referralTree")}
                    </h3>
                    <ReferralTree
                      referrals={referrals || []}
                      isLoading={referralsLoading}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="wallet">
                  <div className="bg-noir-light/30 rounded-xl border border-gold/10 p-6">
                    <h3 className="font-display text-xl text-cream mb-6">
                      {t("ambassador.walletManagement")}
                    </h3>
                    <WalletManager
                      stats={stats!}
                      transactions={transactions || []}
                      isLoading={transactionsLoading || statsLoading}
                      refetchStats={refetchStats}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="simulator">
                  <div className="bg-noir-light/30 rounded-xl border border-gold/10 p-6">
                    <IncomeSimulator />
                  </div>
                </TabsContent>

                <TabsContent value="assets">
                  <div className="bg-noir-light/30 rounded-xl border border-gold/10 p-6">
                    <ShareableAssetsLibrary />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
