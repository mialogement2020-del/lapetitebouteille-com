import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  TrendingUp, 
  Wallet, 
  Crown, 
  ArrowUpRight, 
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Loader2,
  Eye,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useSensitiveOperation } from "@/hooks/useSensitiveOperation";
import { TwoFAVerifyDialog } from "./TwoFAVerifyDialog";
 
 type Ambassador = {
   user_id: string;
   email: string;
   first_name: string | null;
   last_name: string | null;
   phone: string | null;
   referral_code: string;
   custom_code: string | null;
   total_clicks: number;
   total_signups: number;
   total_orders: number;
   total_revenue: number;
   current_rank: string | null;
   active_referrals_count: number;
   wallet_balance: number;
   pending_balance: number;
   total_earned: number;
   created_at: string;
 };
 
 type WithdrawalRequest = {
   id: string;
   user_id: string;
   amount: number;
   payment_method: string;
   phone_number: string;
   status: string;
   created_at: string;
   rejection_reason: string | null;
   profile: {
     first_name: string | null;
     last_name: string | null;
     email: string | null;
   } | null;
 };
 
 const rankColors: Record<string, string> = {
   bronze: "bg-amber-600/20 text-amber-400 border-amber-600/30",
   silver: "bg-slate-400/20 text-slate-300 border-slate-400/30",
   gold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
   diamond: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
   elite: "bg-purple-500/20 text-purple-300 border-purple-500/30",
 };
 
 const rankEmojis: Record<string, string> = {
   bronze: "🥉",
   silver: "🥈",
   gold: "🥇",
   diamond: "💎",
   elite: "👑",
 };
 
export function MLMDashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [rankFilter, setRankFilter] = useState<string>("all");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 2FA protection for sensitive operations
  const {
    executeSensitiveOperation,
    showVerifyDialog,
    setShowVerifyDialog,
    handleVerify,
    is2FAEnabled,
    loading: is2FALoading,
    operationName,
    operationDescription,
  } = useSensitiveOperation({
    operationName: "Validation retrait",
    description: "L'approbation ou le rejet d'un retrait nécessite une vérification 2FA",
  });
 
   // Fetch ambassadors with their stats
   const { data: ambassadors = [], isLoading: isLoadingAmbassadors, refetch: refetchAmbassadors } = useQuery({
     queryKey: ["admin-ambassadors"],
     queryFn: async () => {
       // Get referral codes with user data
       const { data: codes, error: codesError } = await supabase
         .from("referral_codes")
         .select(`
           user_id,
           code,
           custom_code,
           total_clicks,
           total_signups,
           total_orders,
           total_revenue,
           created_at
         `)
         .eq("is_active", true);
 
       if (codesError) throw codesError;
 
       // Get user profiles
       const userIds = codes?.map(c => c.user_id) || [];
       const { data: profiles } = await supabase
         .from("profiles")
         .select("id, email, first_name, last_name, phone")
         .in("id", userIds);
 
       // Get user ranks
       const { data: ranks } = await supabase
         .from("user_ranks")
         .select("user_id, current_rank, active_referrals_count")
         .in("user_id", userIds);
 
       // Get wallets
       const { data: wallets } = await supabase
         .from("wallets")
         .select("user_id, balance, pending_balance, total_earned")
         .in("user_id", userIds);
 
       // Combine data
       return codes?.map(code => {
         const profile = profiles?.find(p => p.id === code.user_id);
         const rank = ranks?.find(r => r.user_id === code.user_id);
         const wallet = wallets?.find(w => w.user_id === code.user_id);
 
         return {
           user_id: code.user_id,
           email: profile?.email || "",
           first_name: profile?.first_name,
           last_name: profile?.last_name,
           phone: profile?.phone,
           referral_code: code.code,
           custom_code: code.custom_code,
           total_clicks: code.total_clicks || 0,
           total_signups: code.total_signups || 0,
           total_orders: code.total_orders || 0,
           total_revenue: code.total_revenue || 0,
           current_rank: rank?.current_rank || "bronze",
           active_referrals_count: rank?.active_referrals_count || 0,
           wallet_balance: wallet?.balance || 0,
           pending_balance: wallet?.pending_balance || 0,
           total_earned: wallet?.total_earned || 0,
           created_at: code.created_at,
         } as Ambassador;
       }) || [];
     },
   });
 
   // Fetch withdrawal requests
   const { data: withdrawals = [], isLoading: isLoadingWithdrawals, refetch: refetchWithdrawals } = useQuery({
     queryKey: ["admin-withdrawals"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("withdrawal_requests")
         .select(`
           id,
           user_id,
           amount,
           payment_method,
           phone_number,
           status,
           created_at,
           rejection_reason
         `)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
 
       // Get profiles for the users
       const userIds = data?.map(w => w.user_id) || [];
       const { data: profiles } = await supabase
         .from("profiles")
         .select("id, first_name, last_name, email")
         .in("id", userIds);
 
       return data?.map(w => ({
         ...w,
         profile: profiles?.find(p => p.id === w.user_id) || null,
       })) as WithdrawalRequest[];
     },
   });
 
   // Process withdrawal mutation
   const processWithdrawal = useMutation({
     mutationFn: async ({ id, action, reason }: { id: string; action: "approve" | "reject"; reason?: string }) => {
       const { error } = await supabase
         .from("withdrawal_requests")
         .update({
           status: action === "approve" ? "completed" : "rejected",
           processed_at: new Date().toISOString(),
           rejection_reason: reason || null,
         })
         .eq("id", id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
       queryClient.invalidateQueries({ queryKey: ["admin-ambassadors"] });
     },
   });
 
   // Calculate stats
   const stats = {
     totalAmbassadors: ambassadors.length,
     totalRevenue: ambassadors.reduce((sum, a) => sum + a.total_revenue, 0),
     totalCommissions: ambassadors.reduce((sum, a) => sum + a.total_earned, 0),
     pendingWithdrawals: withdrawals.filter(w => w.status === "pending").length,
   };
 
   // Filter ambassadors
   const filteredAmbassadors = ambassadors.filter(a => {
     const matchesSearch = 
       a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       a.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       a.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       a.referral_code.toLowerCase().includes(searchQuery.toLowerCase());
     
     const matchesRank = rankFilter === "all" || a.current_rank === rankFilter;
     
     return matchesSearch && matchesRank;
   });
 
  const handleApproveWithdrawal = async (withdrawal: WithdrawalRequest) => {
    await executeSensitiveOperation(async () => {
      setIsProcessing(true);
      try {
        await processWithdrawal.mutateAsync({ id: withdrawal.id, action: "approve" });
        toast({
          title: "Retrait approuvé",
          description: `Le retrait de ${withdrawal.amount.toLocaleString()} FCFA a été approuvé.`,
        });
        setSelectedWithdrawal(null);
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de traiter le retrait",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    });
  };

  const handleRejectWithdrawal = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) {
      toast({
        title: "Raison requise",
        description: "Veuillez indiquer la raison du rejet",
        variant: "destructive",
      });
      return;
    }

    await executeSensitiveOperation(async () => {
      setIsProcessing(true);
      try {
        await processWithdrawal.mutateAsync({ 
          id: selectedWithdrawal.id, 
          action: "reject", 
          reason: rejectionReason 
        });
        toast({
          title: "Retrait rejeté",
          description: "La demande de retrait a été rejetée.",
        });
        setSelectedWithdrawal(null);
        setRejectionReason("");
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de rejeter le retrait",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    });
  };
 
   return (
     <div className="space-y-6">
       {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <Card className="bg-noir/50 border-gold/20">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-cream/70">Ambassadeurs</CardTitle>
             <Users className="h-4 w-4 text-primary" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-cream">{stats.totalAmbassadors}</div>
             <p className="text-xs text-cream/50">inscrits au programme</p>
           </CardContent>
         </Card>
 
         <Card className="bg-noir/50 border-gold/20">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-cream/70">CA Généré</CardTitle>
             <TrendingUp className="h-4 w-4 text-success" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-cream">
               {stats.totalRevenue.toLocaleString()} <span className="text-sm">FCFA</span>
             </div>
             <p className="text-xs text-cream/50">par le réseau MLM</p>
           </CardContent>
         </Card>
 
         <Card className="bg-noir/50 border-gold/20">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-cream/70">Commissions</CardTitle>
             <Wallet className="h-4 w-4 text-info" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-cream">
               {stats.totalCommissions.toLocaleString()} <span className="text-sm">FCFA</span>
             </div>
             <p className="text-xs text-cream/50">versées aux ambassadeurs</p>
           </CardContent>
         </Card>
 
         <Card className="bg-noir/50 border-gold/20">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-cream/70">Retraits en attente</CardTitle>
             <Crown className="h-4 w-4 text-warning" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-cream">{stats.pendingWithdrawals}</div>
             <p className="text-xs text-cream/50">à traiter</p>
           </CardContent>
         </Card>
       </div>
 
       {/* Pending Withdrawals */}
       {withdrawals.filter(w => w.status === "pending").length > 0 && (
         <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-warning/10 border border-warning/30 rounded-lg p-4"
         >
           <h3 className="font-semibold text-warning mb-3 flex items-center gap-2">
             <Wallet className="h-5 w-5" />
             Demandes de retrait en attente ({withdrawals.filter(w => w.status === "pending").length})
           </h3>
           <div className="space-y-2">
             {withdrawals.filter(w => w.status === "pending").map(withdrawal => (
               <div 
                 key={withdrawal.id} 
                 className="flex items-center justify-between bg-noir/50 rounded-lg p-3"
               >
                 <div>
                   <p className="text-cream font-medium">
                     {withdrawal.profile?.first_name} {withdrawal.profile?.last_name}
                   </p>
                   <p className="text-sm text-cream/60">
                     {withdrawal.amount.toLocaleString()} FCFA via {withdrawal.payment_method === "mtn_money" ? "MTN Money" : "Orange Money"}
                   </p>
                   <p className="text-xs text-cream/40">
                     {format(new Date(withdrawal.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                   </p>
                 </div>
                 <div className="flex gap-2">
                   <Button
                     size="sm"
                     variant="outline"
                     className="border-success/50 text-success hover:bg-success/10"
                     onClick={() => handleApproveWithdrawal(withdrawal)}
                     disabled={isProcessing}
                   >
                     <Check className="h-4 w-4" />
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     className="border-destructive/50 text-destructive hover:bg-destructive/10"
                     onClick={() => setSelectedWithdrawal(withdrawal)}
                     disabled={isProcessing}
                   >
                     <X className="h-4 w-4" />
                   </Button>
                 </div>
               </div>
             ))}
           </div>
         </motion.div>
       )}
 
       {/* Ambassadors Table */}
       <div className="bg-noir/50 border border-gold/20 rounded-lg p-6">
         <div className="flex items-center justify-between mb-6">
           <h3 className="text-lg font-semibold text-cream flex items-center gap-2">
             <Users className="h-5 w-5 text-primary" />
             Liste des Ambassadeurs
           </h3>
           <div className="flex items-center gap-3">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
               <Input
                 placeholder="Rechercher..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-10 w-64 bg-cream/5 border-gold/30"
               />
             </div>
             <Select value={rankFilter} onValueChange={setRankFilter}>
               <SelectTrigger className="w-40 bg-cream/5 border-gold/30">
                 <Filter className="h-4 w-4 mr-2" />
                 <SelectValue placeholder="Rang" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Tous les rangs</SelectItem>
                 <SelectItem value="bronze">🥉 Bronze</SelectItem>
                 <SelectItem value="silver">🥈 Argent</SelectItem>
                 <SelectItem value="gold">🥇 Or</SelectItem>
                 <SelectItem value="diamond">💎 Diamant</SelectItem>
                 <SelectItem value="elite">👑 Élite</SelectItem>
               </SelectContent>
             </Select>
             <Button
               variant="outline"
               size="icon"
               onClick={() => refetchAmbassadors()}
               className="border-gold/30"
             >
               <RefreshCw className="h-4 w-4" />
             </Button>
           </div>
         </div>
 
         {isLoadingAmbassadors ? (
           <div className="flex items-center justify-center py-12">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
         ) : filteredAmbassadors.length === 0 ? (
           <div className="text-center py-12 text-cream/60">
             Aucun ambassadeur trouvé
           </div>
         ) : (
           <Table>
             <TableHeader>
               <TableRow className="border-gold/20 hover:bg-transparent">
                 <TableHead className="text-cream/70">Ambassadeur</TableHead>
                 <TableHead className="text-cream/70">Code</TableHead>
                 <TableHead className="text-cream/70">Rang</TableHead>
                 <TableHead className="text-cream/70 text-right">Filleuls</TableHead>
                 <TableHead className="text-cream/70 text-right">CA Généré</TableHead>
                 <TableHead className="text-cream/70 text-right">Gains</TableHead>
                 <TableHead className="text-cream/70 text-right">Solde</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {filteredAmbassadors.map((ambassador) => (
                 <TableRow key={ambassador.user_id} className="border-gold/10 hover:bg-cream/5">
                   <TableCell>
                     <div>
                       <p className="font-medium text-cream">
                         {ambassador.first_name} {ambassador.last_name}
                       </p>
                       <p className="text-xs text-cream/50">{ambassador.email}</p>
                     </div>
                   </TableCell>
                   <TableCell>
                     <code className="px-2 py-1 rounded bg-cream/10 text-primary text-sm">
                       {ambassador.custom_code || ambassador.referral_code}
                     </code>
                   </TableCell>
                   <TableCell>
                     <Badge className={rankColors[ambassador.current_rank || "bronze"]}>
                       {rankEmojis[ambassador.current_rank || "bronze"]} {ambassador.current_rank?.toUpperCase()}
                     </Badge>
                   </TableCell>
                   <TableCell className="text-right text-cream">
                     {ambassador.active_referrals_count}
                   </TableCell>
                   <TableCell className="text-right">
                     <span className="text-cream font-medium">
                       {ambassador.total_revenue.toLocaleString()} <span className="text-xs text-cream/50">FCFA</span>
                     </span>
                   </TableCell>
                   <TableCell className="text-right">
                     <span className="text-success font-medium">
                       +{ambassador.total_earned.toLocaleString()} <span className="text-xs">FCFA</span>
                     </span>
                   </TableCell>
                   <TableCell className="text-right">
                     <span className="text-cream font-medium">
                       {ambassador.wallet_balance.toLocaleString()} <span className="text-xs text-cream/50">FCFA</span>
                     </span>
                     {ambassador.pending_balance > 0 && (
                       <p className="text-xs text-warning">
                         +{ambassador.pending_balance.toLocaleString()} en attente
                       </p>
                     )}
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         )}
       </div>
 
       {/* Rejection Dialog */}
       <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
         <DialogContent className="bg-noir border-gold/30">
           <DialogHeader>
             <DialogTitle className="text-cream">Rejeter la demande de retrait</DialogTitle>
             <DialogDescription className="text-cream/60">
               Indiquez la raison du rejet pour{" "}
               <strong>{selectedWithdrawal?.profile?.first_name} {selectedWithdrawal?.profile?.last_name}</strong>
               {" "}({selectedWithdrawal?.amount.toLocaleString()} FCFA)
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <Textarea
               placeholder="Raison du rejet..."
               value={rejectionReason}
               onChange={(e) => setRejectionReason(e.target.value)}
               className="bg-cream/5 border-gold/30 text-cream"
               rows={3}
             />
           </div>
           <DialogFooter>
             <Button
               variant="outline"
               onClick={() => setSelectedWithdrawal(null)}
               className="border-gold/30"
             >
               Annuler
             </Button>
             <Button
               variant="destructive"
               onClick={handleRejectWithdrawal}
               disabled={isProcessing || !rejectionReason.trim()}
             >
               {isProcessing ? (
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
               ) : null}
                Confirmer le rejet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2FA Verification Dialog */}
        <TwoFAVerifyDialog
          open={showVerifyDialog}
          onOpenChange={setShowVerifyDialog}
          onVerify={handleVerify}
          loading={is2FALoading}
          title={operationName}
          description={operationDescription}
        />
      </div>
    );
  }