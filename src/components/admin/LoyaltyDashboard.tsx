import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Award, 
  Users, 
  TrendingUp, 
  Search, 
  RefreshCw,
  Gift,
  Loader2,
  Plus,
  Minus,
  Settings,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserLoyalty {
  id: string;
  user_id: string;
  total_points: number;
  lifetime_points: number;
  tier: string;
  created_at: string;
  updated_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface LoyaltyConfig {
  id: string;
  points_per_fcfa: number;
  fcfa_per_point: number;
  min_points_redeem: number;
  points_value_fcfa: number;
  welcome_bonus: number;
  birthday_bonus: number;
  is_active: boolean;
}

interface LoyaltyTransaction {
  id: string;
  user_id: string;
  points: number;
  type: string;
  description: string | null;
  balance_after: number;
  created_at: string;
}

const tierColors: Record<string, string> = {
  bronze: "bg-amber-700 text-white",
  silver: "bg-gray-400 text-noir",
  gold: "bg-yellow-500 text-noir",
  platinum: "bg-purple-400 text-white",
};

const tierLabels: Record<string, string> = {
  bronze: "Bronze",
  silver: "Argent",
  gold: "Or",
  platinum: "Platine",
};

export function LoyaltyDashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserLoyalty | null>(null);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Fetch all users with loyalty data
  const { data: usersLoyalty, isLoading, refetch } = useQuery({
    queryKey: ["admin-loyalty-users"],
    queryFn: async () => {
      // First fetch loyalty data
      const { data: loyaltyData, error: loyaltyError } = await supabase
        .from("user_loyalty")
        .select("*")
        .order("lifetime_points", { ascending: false });

      if (loyaltyError) throw loyaltyError;

      if (!loyaltyData || loyaltyData.length === 0) return [];

      // Then fetch profiles for all users
      const userIds = loyaltyData.map(l => l.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);

      // Merge the data
      return loyaltyData.map(loyalty => ({
        ...loyalty,
        profile: profilesData?.find(p => p.id === loyalty.user_id) || null,
      })) as UserLoyalty[];
    },
  });

  // Fetch loyalty config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["admin-loyalty-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_config")
        .select("*")
        .single();

      if (error) throw error;
      return data as LoyaltyConfig;
    },
  });

  // Fetch transactions for selected user
  const { data: userTransactions } = useQuery({
    queryKey: ["admin-loyalty-transactions", selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data, error } = await supabase
        .from("loyalty_transactions")
        .select("*")
        .eq("user_id", selectedUser.user_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as LoyaltyTransaction[];
    },
    enabled: !!selectedUser && isHistoryOpen,
  });

  // Fetch aggregate stats
  const { data: stats } = useQuery({
    queryKey: ["admin-loyalty-stats"],
    queryFn: async () => {
      const { data: loyaltyData } = await supabase
        .from("user_loyalty")
        .select("total_points, lifetime_points, tier");

      const totalUsers = loyaltyData?.length || 0;
      const totalPointsInCirculation = loyaltyData?.reduce((sum, u) => sum + (u.total_points || 0), 0) || 0;
      const totalPointsEarned = loyaltyData?.reduce((sum, u) => sum + (u.lifetime_points || 0), 0) || 0;
      
      const tierCounts = {
        bronze: loyaltyData?.filter(u => u.tier === "bronze").length || 0,
        silver: loyaltyData?.filter(u => u.tier === "silver").length || 0,
        gold: loyaltyData?.filter(u => u.tier === "gold").length || 0,
        platinum: loyaltyData?.filter(u => u.tier === "platinum").length || 0,
      };

      return {
        totalUsers,
        totalPointsInCirculation,
        totalPointsEarned,
        tierCounts,
      };
    },
  });

  // Mutation to adjust points
  const adjustPointsMutation = useMutation({
    mutationFn: async ({ userId, points, type, reason }: { userId: string; points: number; type: "add" | "remove"; reason: string }) => {
      // Get current balance
      const { data: currentData, error: fetchError } = await supabase
        .from("user_loyalty")
        .select("total_points, lifetime_points")
        .eq("user_id", userId)
        .single();

      if (fetchError) throw fetchError;

      const currentPoints = currentData?.total_points || 0;
      const adjustment = type === "add" ? points : -points;
      const newBalance = currentPoints + adjustment;

      if (newBalance < 0) {
        throw new Error("Le solde ne peut pas être négatif");
      }

      // Update user_loyalty
      const updateData: { total_points: number; lifetime_points?: number } = {
        total_points: newBalance,
      };

      // Only increase lifetime_points for additions
      if (type === "add") {
        updateData.lifetime_points = (currentData?.lifetime_points || 0) + points;
      }

      const { error: updateError } = await supabase
        .from("user_loyalty")
        .update(updateData)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from("loyalty_transactions")
        .insert({
          user_id: userId,
          points: adjustment,
          type: type === "add" ? "admin_credit" : "admin_debit",
          description: `[Admin] ${reason}`,
          balance_after: newBalance,
        });

      if (transactionError) throw transactionError;

      return { newBalance };
    },
    onSuccess: (data) => {
      toast({
        title: "Points ajustés",
        description: `Le nouveau solde est de ${data.newBalance} points.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-loyalty-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-loyalty-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-loyalty-transactions"] });
      setIsAdjustDialogOpen(false);
      setAdjustmentAmount("");
      setAdjustmentReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajuster les points",
        variant: "destructive",
      });
    },
  });

  // Mutation to update config
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<LoyaltyConfig>) => {
      const { error } = await supabase
        .from("loyalty_config")
        .update(newConfig)
        .eq("id", config?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Configuration mise à jour",
        description: "Les paramètres de fidélité ont été enregistrés.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-loyalty-config"] });
      setIsConfigDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la configuration",
        variant: "destructive",
      });
    },
  });

  // Filter users
  const filteredUsers = usersLoyalty?.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profile?.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTier = tierFilter === "all" || user.tier === tierFilter;

    return matchesSearch && matchesTier;
  });

  const handleAdjustPoints = () => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason) return;
    
    const points = parseInt(adjustmentAmount, 10);
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nombre de points valide",
        variant: "destructive",
      });
      return;
    }

    adjustPointsMutation.mutate({
      userId: selectedUser.user_id,
      points,
      type: adjustmentType,
      reason: adjustmentReason,
    });
  };

  const formatNumber = (num: number) => new Intl.NumberFormat("fr-FR").format(num);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-noir/50 border border-gold/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cream/60 text-sm">Membres fidélité</p>
              <p className="text-2xl font-bold text-cream">{formatNumber(stats?.totalUsers || 0)}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-noir/50 border border-gold/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cream/60 text-sm">Points en circulation</p>
              <p className="text-2xl font-bold text-cream">{formatNumber(stats?.totalPointsInCirculation || 0)}</p>
            </div>
            <Award className="h-8 w-8 text-warning" />
          </div>
        </div>
        
        <div className="bg-noir/50 border border-gold/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cream/60 text-sm">Points totaux gagnés</p>
              <p className="text-2xl font-bold text-cream">{formatNumber(stats?.totalPointsEarned || 0)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-success" />
          </div>
        </div>
        
        <div className="bg-noir/50 border border-gold/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cream/60 text-sm">Valeur en FCFA</p>
              <p className="text-2xl font-bold text-cream">
                {formatNumber((stats?.totalPointsInCirculation || 0) * (config?.points_value_fcfa || 10))}
              </p>
            </div>
            <Gift className="h-8 w-8 text-info" />
          </div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-noir/50 border border-gold/20 rounded-lg p-4">
        <h3 className="text-cream font-semibold mb-4">Répartition par niveau</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(stats?.tierCounts || {}).map(([tier, count]) => (
            <div key={tier} className="flex items-center gap-2">
              <Badge className={tierColors[tier]}>{tierLabels[tier]}</Badge>
              <span className="text-cream">{count} membres</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-noir/50 border-gold/20 text-cream"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[150px] bg-noir/50 border-gold/20 text-cream">
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="silver">Argent</SelectItem>
              <SelectItem value="gold">Or</SelectItem>
              <SelectItem value="platinum">Platine</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-gold/30 text-cream hover:bg-cream/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConfigDialogOpen(true)}
            className="border-gold/30 text-cream hover:bg-cream/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-noir/50 border border-gold/20 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-gold/20 hover:bg-transparent">
                <TableHead className="text-cream/80">Membre</TableHead>
                <TableHead className="text-cream/80">Niveau</TableHead>
                <TableHead className="text-cream/80 text-right">Points actuels</TableHead>
                <TableHead className="text-cream/80 text-right">Points à vie</TableHead>
                <TableHead className="text-cream/80 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-cream/60 py-8">
                    Aucun membre trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id} className="border-gold/10 hover:bg-cream/5">
                    <TableCell>
                      <div>
                        <p className="text-cream font-medium">
                          {user.profile?.first_name || ""} {user.profile?.last_name || ""}
                        </p>
                        <p className="text-cream/60 text-sm">{user.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={tierColors[user.tier || "bronze"]}>
                        {tierLabels[user.tier || "bronze"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-cream">
                      {formatNumber(user.total_points || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-cream/60">
                      {formatNumber(user.lifetime_points || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsHistoryOpen(!isHistoryOpen);
                          }}
                          className="text-cream/60 hover:text-cream"
                        >
                          {isHistoryOpen && selectedUser?.id === user.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setAdjustmentType("add");
                            setIsAdjustDialogOpen(true);
                          }}
                          className="text-success hover:text-success/80"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setAdjustmentType("remove");
                            setIsAdjustDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Transaction History (expandable) */}
      {isHistoryOpen && selectedUser && (
        <div className="bg-noir/50 border border-gold/20 rounded-lg p-4">
          <h3 className="text-cream font-semibold mb-4">
            Historique de {selectedUser.profile?.first_name} {selectedUser.profile?.last_name}
          </h3>
          <Table>
            <TableHeader>
              <TableRow className="border-gold/20">
                <TableHead className="text-cream/80">Date</TableHead>
                <TableHead className="text-cream/80">Type</TableHead>
                <TableHead className="text-cream/80">Description</TableHead>
                <TableHead className="text-cream/80 text-right">Points</TableHead>
                <TableHead className="text-cream/80 text-right">Solde après</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userTransactions?.map((tx) => (
                <TableRow key={tx.id} className="border-gold/10">
                  <TableCell className="text-cream/60">
                    {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.points > 0 ? "default" : "destructive"}>
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-cream/80">{tx.description || "-"}</TableCell>
                  <TableCell className={`text-right font-mono ${tx.points > 0 ? "text-success" : "text-destructive"}`}>
                    {tx.points > 0 ? "+" : ""}{formatNumber(tx.points)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-cream">
                    {formatNumber(tx.balance_after)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Adjust Points Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="bg-noir border-gold/20">
          <DialogHeader>
            <DialogTitle className="text-cream">
              {adjustmentType === "add" ? "Ajouter des points" : "Retirer des points"}
            </DialogTitle>
            <DialogDescription className="text-cream/60">
              {selectedUser?.profile?.first_name} {selectedUser?.profile?.last_name} - 
              Solde actuel: {formatNumber(selectedUser?.total_points || 0)} points
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-cream">Nombre de points</Label>
              <Input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="Ex: 100"
                className="bg-noir/50 border-gold/20 text-cream"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-cream">Raison</Label>
              <Textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Expliquez la raison de cet ajustement..."
                className="bg-noir/50 border-gold/20 text-cream"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAdjustDialogOpen(false)}
              className="border-gold/30 text-cream"
            >
              Annuler
            </Button>
            <Button
              onClick={handleAdjustPoints}
              disabled={adjustPointsMutation.isPending || !adjustmentAmount || !adjustmentReason}
              className={adjustmentType === "add" ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90"}
            >
              {adjustPointsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {adjustmentType === "add" ? "Ajouter" : "Retirer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="bg-noir border-gold/20">
          <DialogHeader>
            <DialogTitle className="text-cream">Configuration du programme fidélité</DialogTitle>
            <DialogDescription className="text-cream/60">
              Paramétrez les règles d'accumulation et d'utilisation des points
            </DialogDescription>
          </DialogHeader>
          {config && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateConfigMutation.mutate({
                  points_per_fcfa: Number(formData.get("points_per_fcfa")),
                  fcfa_per_point: Number(formData.get("fcfa_per_point")),
                  min_points_redeem: Number(formData.get("min_points_redeem")),
                  points_value_fcfa: Number(formData.get("points_value_fcfa")),
                  welcome_bonus: Number(formData.get("welcome_bonus")),
                  birthday_bonus: Number(formData.get("birthday_bonus")),
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-cream">Points par FCFA</Label>
                  <Input
                    name="points_per_fcfa"
                    type="number"
                    defaultValue={config.points_per_fcfa}
                    className="bg-noir/50 border-gold/20 text-cream"
                  />
                  <p className="text-xs text-cream/40">Points gagnés pour X FCFA</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-cream">FCFA par point</Label>
                  <Input
                    name="fcfa_per_point"
                    type="number"
                    defaultValue={config.fcfa_per_point}
                    className="bg-noir/50 border-gold/20 text-cream"
                  />
                  <p className="text-xs text-cream/40">Dépense requise pour 1 point</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-cream">Minimum pour utiliser</Label>
                  <Input
                    name="min_points_redeem"
                    type="number"
                    defaultValue={config.min_points_redeem}
                    className="bg-noir/50 border-gold/20 text-cream"
                  />
                  <p className="text-xs text-cream/40">Points minimum à utiliser</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-cream">Valeur point (FCFA)</Label>
                  <Input
                    name="points_value_fcfa"
                    type="number"
                    defaultValue={config.points_value_fcfa}
                    className="bg-noir/50 border-gold/20 text-cream"
                  />
                  <p className="text-xs text-cream/40">Valeur d'1 point en FCFA</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-cream">Bonus bienvenue</Label>
                  <Input
                    name="welcome_bonus"
                    type="number"
                    defaultValue={config.welcome_bonus}
                    className="bg-noir/50 border-gold/20 text-cream"
                  />
                  <p className="text-xs text-cream/40">Points offerts à l'inscription</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-cream">Bonus anniversaire</Label>
                  <Input
                    name="birthday_bonus"
                    type="number"
                    defaultValue={config.birthday_bonus}
                    className="bg-noir/50 border-gold/20 text-cream"
                  />
                  <p className="text-xs text-cream/40">Points offerts chaque anniversaire</p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfigDialogOpen(false)}
                  className="border-gold/30 text-cream"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={updateConfigMutation.isPending}
                  className="bg-gradient-gold text-noir"
                >
                  {updateConfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
