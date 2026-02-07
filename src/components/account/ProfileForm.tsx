import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Phone, Calendar, Save, Loader2, Camera, Upload, ChevronDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface ProfileFormProps {
  profile: Profile;
  onUpdate: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const { user } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    phone: profile.phone || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5 Mo.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const newAvatarUrl = urlData.publicUrl;
      const { error: updateError } = await onUpdate({ avatar_url: newAvatarUrl });

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      toast({
        title: "Photo mise à jour",
        description: "Votre photo de profil a été modifiée avec succès.",
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la photo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const getInitials = () => {
    const first = formData.first_name?.[0] || profile.email?.[0] || "";
    const last = formData.last_name?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  const getDisplayName = () => {
    if (formData.first_name || formData.last_name) {
      return `${formData.first_name} ${formData.last_name}`.trim();
    }
    return profile.email || "Utilisateur";
  };

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
    setIsOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-noir/50 border-gold/20">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-4">
            <CollapsibleTrigger asChild>
              <button className="w-full text-left group">
                <div className="flex items-center gap-4">
                  {/* Avatar compact */}
                  <div className="relative">
                    <Avatar className="h-14 w-14 border-2 border-gold/30">
                      <AvatarImage src={avatarUrl} alt="Photo de profil" />
                      <AvatarFallback className="bg-primary/20 text-primary text-lg font-semibold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Info summary */}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-cream text-lg font-semibold truncate">
                      {getDisplayName()}
                    </CardTitle>
                    <p className="text-cream/50 text-sm truncate">
                      {profile.email}
                    </p>
                  </div>

                  {/* Toggle button */}
                  <div className="flex items-center gap-2">
                    <span className="text-cream/40 text-xs hidden sm:block">
                      {isOpen ? "Fermer" : "Modifier"}
                    </span>
                    <div className="p-2 rounded-full bg-cream/5 group-hover:bg-cream/10 transition-colors">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-primary transition-transform rotate-180" />
                      ) : (
                        <Pencil className="h-4 w-4 text-cream/60 group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>

          <AnimatePresence>
            {isOpen && (
              <CollapsibleContent forceMount asChild>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="pt-0">
                    <div className="border-t border-gold/10 pt-6">
                      <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center gap-3 pb-4">
                          <div className="relative group">
                            <Avatar className="h-20 w-20 border-2 border-gold/30">
                              <AvatarImage src={avatarUrl} alt="Photo de profil" />
                              <AvatarFallback className="bg-primary/20 text-primary text-xl font-semibold">
                                {getInitials()}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingAvatar}
                              className="absolute inset-0 flex items-center justify-center rounded-full bg-noir/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              {isUploadingAvatar ? (
                                <Loader2 className="h-5 w-5 text-cream animate-spin" />
                              ) : (
                                <Camera className="h-5 w-5 text-cream" />
                              )}
                            </button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              className="hidden"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            className="text-cream/60 hover:text-cream hover:bg-cream/10 text-xs"
                          >
                            {isUploadingAvatar ? (
                              <>
                                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                Téléchargement...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-1.5 h-3 w-3" />
                                Changer la photo
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Email (read-only) */}
                        <div className="space-y-1.5">
                          <Label className="text-cream/70 text-xs">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
                            <Input
                              value={profile.email || ""}
                              disabled
                              className="pl-10 h-10 bg-cream/5 border-gold/15 text-cream/50 text-sm"
                            />
                          </div>
                        </div>

                        {/* First Name & Last Name */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="first_name" className="text-cream/70 text-xs">
                              Prénom
                            </Label>
                            <Input
                              id="first_name"
                              name="first_name"
                              value={formData.first_name}
                              onChange={handleChange}
                              placeholder="Jean"
                              className="h-10 bg-cream/10 border-gold/20 text-cream placeholder:text-cream/30 focus:border-primary text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="last_name" className="text-cream/70 text-xs">
                              Nom
                            </Label>
                            <Input
                              id="last_name"
                              name="last_name"
                              value={formData.last_name}
                              onChange={handleChange}
                              placeholder="Dupont"
                              className="h-10 bg-cream/10 border-gold/20 text-cream placeholder:text-cream/30 focus:border-primary text-sm"
                            />
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-cream/70 text-xs">
                            Téléphone
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="+237 6XX XXX XXX"
                              className="pl-10 h-10 bg-cream/10 border-gold/20 text-cream placeholder:text-cream/30 focus:border-primary text-sm"
                            />
                          </div>
                        </div>

                        {/* Date of Birth (read-only) */}
                        {profile.date_of_birth && (
                          <div className="space-y-1.5">
                            <Label className="text-cream/70 text-xs">Date de naissance</Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
                              <Input
                                value={new Date(profile.date_of_birth).toLocaleDateString("fr-FR")}
                                disabled
                                className="pl-10 h-10 bg-cream/5 border-gold/15 text-cream/50 text-sm"
                              />
                            </div>
                            {profile.is_age_verified && (
                              <p className="text-xs text-green-500">✓ Âge vérifié (18+)</p>
                            )}
                          </div>
                        )}

                        {/* Submit */}
                        <Button
                          type="submit"
                          disabled={isLoading}
                          size="sm"
                          className="w-full bg-gradient-gold text-noir font-semibold hover:opacity-90"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Enregistrer
                            </>
                          )}
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </Card>
    </motion.div>
  );
}
