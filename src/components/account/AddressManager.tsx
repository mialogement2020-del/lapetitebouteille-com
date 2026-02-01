import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Plus, Edit2, Trash2, Star, Phone, Home, Briefcase } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAddresses } from "@/hooks/useAddresses";
import { AddressFormDialog } from "./AddressFormDialog";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

type Address = Tables<"addresses">;

export function AddressManager() {
  const { addresses, loading, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useAddresses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  const handleAddAddress = async (data: Omit<Address, "id" | "user_id" | "created_at" | "updated_at">) => {
    const { error } = await addAddress(data);
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'adresse",
        variant: "destructive",
      });
    } else {
      toast({ title: "Adresse ajoutée avec succès" });
      setIsDialogOpen(false);
    }
  };

  const handleUpdateAddress = async (data: Omit<Address, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!editingAddress) return;
    const { error } = await updateAddress(editingAddress.id, data);
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'adresse",
        variant: "destructive",
      });
    } else {
      toast({ title: "Adresse modifiée avec succès" });
      setEditingAddress(null);
    }
  };

  const handleDeleteAddress = async () => {
    if (!deletingAddressId) return;
    const { error } = await deleteAddress(deletingAddressId);
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'adresse",
        variant: "destructive",
      });
    } else {
      toast({ title: "Adresse supprimée" });
    }
    setDeletingAddressId(null);
  };

  const handleSetDefault = async (id: string) => {
    const { error } = await setDefaultAddress(id);
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de définir comme adresse par défaut",
        variant: "destructive",
      });
    } else {
      toast({ title: "Adresse par défaut mise à jour" });
    }
  };

  const getLabelIcon = (label: string | null) => {
    switch (label?.toLowerCase()) {
      case "bureau":
      case "travail":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <Home className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-cream/10" />
          <Skeleton className="h-4 w-64 bg-cream/10" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full bg-cream/10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-cream flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Mes adresses de livraison
              </CardTitle>
              <CardDescription className="text-cream/60">
                Gérez vos adresses pour une livraison plus rapide
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-primary text-noir hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-16 w-16 mx-auto text-cream/20 mb-4" />
              <p className="text-cream/60 text-lg mb-2">Aucune adresse enregistrée</p>
              <p className="text-cream/40 text-sm mb-6">
                Ajoutez une adresse pour faciliter vos prochaines commandes
              </p>
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une adresse
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {addresses.map((address) => (
                <motion.div
                  key={address.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative p-4 rounded-lg border transition-colors ${
                    address.is_default
                      ? "bg-primary/10 border-primary/50"
                      : "bg-cream/5 border-gold/20 hover:border-gold/40"
                  }`}
                >
                  {/* Label & Default Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-2 text-cream/80">
                      {getLabelIcon(address.label)}
                      <span className="font-medium">{address.label || "Domicile"}</span>
                    </div>
                    {address.is_default && (
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        <Star className="h-3 w-3 mr-1 fill-primary" />
                        Par défaut
                      </Badge>
                    )}
                  </div>

                  {/* Address Details */}
                  <div className="space-y-1 text-sm">
                    <p className="text-cream font-medium">{address.full_name}</p>
                    <p className="text-cream/70">{address.street_address}</p>
                    <p className="text-cream/70">
                      {address.neighborhood && `${address.neighborhood}, `}
                      {address.city}
                    </p>
                    <p className="text-cream/60 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {address.phone}
                    </p>
                    {address.additional_info && (
                      <p className="text-cream/50 text-xs italic mt-2">
                        {address.additional_info}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gold/10">
                    {!address.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-cream/60 hover:text-primary hover:bg-primary/10"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Par défaut
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-cream/60 hover:text-cream hover:bg-cream/10"
                      onClick={() => setEditingAddress(address)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingAddressId(address.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Address Dialog */}
      <AddressFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddAddress}
        title="Ajouter une adresse"
      />

      {/* Edit Address Dialog */}
      <AddressFormDialog
        open={!!editingAddress}
        onOpenChange={(open) => !open && setEditingAddress(null)}
        onSubmit={handleUpdateAddress}
        initialData={editingAddress || undefined}
        title="Modifier l'adresse"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAddressId} onOpenChange={(open) => !open && setDeletingAddressId(null)}>
        <AlertDialogContent className="bg-noir border-gold/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-cream">Supprimer l'adresse ?</AlertDialogTitle>
            <AlertDialogDescription className="text-cream/60">
              Cette action est irréversible. L'adresse sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gold/30 text-cream hover:bg-cream/10">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAddress}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
