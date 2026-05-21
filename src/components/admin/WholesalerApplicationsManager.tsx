import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Check, X, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAllWholesalerApplications } from "@/hooks/useWholesaler";
import { toast } from "@/hooks/use-toast";

export const WholesalerApplicationsManager = () => {
  const { data: apps = [], isLoading, approve, reject } = useAllWholesalerApplications();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const handleApprove = async (id: string) => {
    try {
      await approve.mutateAsync(id);
      toast({ title: "Grossiste approuvé ✅" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await reject.mutateAsync({ appId: rejectId, notes: rejectNotes });
      toast({ title: "Candidature refusée" });
      setRejectId(null);
      setRejectNotes("");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const pending = apps.filter((a) => a.status === "pending");
  const processed = apps.filter((a) => a.status !== "pending");

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Candidatures Grossistes
        </CardTitle>
        <CardDescription className="text-cream/60">
          {pending.length} en attente · {processed.length} traitée{processed.length > 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        ) : apps.length === 0 ? (
          <p className="text-cream/60 text-sm py-8 text-center">Aucune candidature pour l'instant.</p>
        ) : (
          <AnimatePresence>
            {apps.map((app) => (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 rounded-lg bg-noir/30 border border-gold/10 space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-cream font-medium flex items-center gap-2">
                      {app.company_name}
                      <Badge variant="outline" className="text-xs">
                        {app.business_type === "entreprise" ? "🏢 Pro" : "🎉 Particulier"}
                      </Badge>
                    </p>
                    <p className="text-xs text-cream/60 mt-1">
                      {app.city} · {app.contact_phone}
                      {app.contact_email && <> · {app.contact_email}</>}
                      {app.niu && <> · NIU {app.niu}</>}
                    </p>
                    {app.estimated_monthly_volume && (
                      <p className="text-xs text-cream/50">Volume estimé : {Number(app.estimated_monthly_volume).toLocaleString("fr-FR")} FCFA / mois</p>
                    )}
                    {app.message && <p className="text-sm text-cream/70 mt-2 italic">"{app.message}"</p>}
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                {app.status === "pending" && (
                  <>
                    {rejectId === app.id ? (
                      <div className="space-y-2 border-t border-gold/10 pt-3">
                        <Textarea
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          placeholder="Motif du refus (visible par le candidat)"
                          className="bg-noir/50 border-gold/20 text-cream"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={handleReject} disabled={reject.isPending}>
                            Confirmer le refus
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setRejectNotes(""); }}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(app.id)}
                          disabled={approve.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/40 text-red-400"
                          onClick={() => setRejectId(app.id)}
                        >
                          <X className="h-4 w-4 mr-1" /> Refuser
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {app.status === "rejected" && app.admin_notes && (
                  <p className="text-xs text-red-300/80 border-t border-gold/10 pt-2">Motif : {app.admin_notes}</p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "pending") return <Badge variant="outline" className="border-yellow-500/40 text-yellow-400"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
  if (status === "approved") return <Badge variant="outline" className="border-green-500/40 text-green-400">Approuvé</Badge>;
  return <Badge variant="outline" className="border-red-500/40 text-red-400">Refusé</Badge>;
};