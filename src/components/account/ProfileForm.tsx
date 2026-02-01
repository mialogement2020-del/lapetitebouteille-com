import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Calendar, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface ProfileFormProps {
  profile: Profile;
  onUpdate: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    phone: profile.phone || "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await onUpdate(formData);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Profil mis à jour",
      description: "Vos informations ont été enregistrées.",
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Non renseignée";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Informations personnelles
          </CardTitle>
          <CardDescription className="text-cream/60">
            Gérez vos informations de profil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="text-cream/80">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
                <Input
                  value={profile.email || ""}
                  disabled
                  className="pl-10 bg-cream/5 border-gold/20 text-cream/60"
                />
              </div>
              <p className="text-xs text-cream/40">
                L'email ne peut pas être modifié
              </p>
            </div>

            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-cream/80">
                  Prénom
                </Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Jean"
                  className="bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-cream/80">
                  Nom
                </Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Dupont"
                  className="bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-cream/80">
                Téléphone
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+237 6XX XXX XXX"
                  className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
                />
              </div>
            </div>

            {/* Date of Birth (read-only) */}
            <div className="space-y-2">
              <Label className="text-cream/80">Date de naissance</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
                <Input
                  value={formatDate(profile.date_of_birth)}
                  disabled
                  className="pl-10 bg-cream/5 border-gold/20 text-cream/60"
                />
              </div>
              {profile.is_age_verified && (
                <p className="text-xs text-green-500">✓ Âge vérifié (18+)</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-gradient-gold text-noir font-semibold hover:opacity-90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
