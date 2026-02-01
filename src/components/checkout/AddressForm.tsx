import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Nom complet requis").max(100),
  phone: z.string().trim().min(9, "Numéro de téléphone invalide").max(15),
  city: z.string().min(1, "Ville requise"),
  neighborhood: z.string().trim().min(2, "Quartier requis").max(100),
  streetAddress: z.string().trim().min(5, "Adresse complète requise").max(200),
  additionalInfo: z.string().max(500).optional(),
});

export type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormProps {
  onSubmit: (data: AddressFormData) => void;
  isLoading?: boolean;
}

const CITIES = [
  { value: "yaounde", label: "Yaoundé" },
  { value: "douala", label: "Douala" },
];

export function AddressForm({ onSubmit, isLoading }: AddressFormProps) {
  const { user } = useAuthContext();
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      city: "",
      neighborhood: "",
      streetAddress: "",
      additionalInfo: "",
    },
  });

  const city = watch("city");

  // Fetch saved addresses for authenticated users
  useEffect(() => {
    if (user?.id) {
      fetchSavedAddresses();
    }
  }, [user?.id]);

  const fetchSavedAddresses = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });

    if (data && data.length > 0) {
      setSavedAddresses(data);
      // Auto-select default address
      const defaultAddr = data.find((a) => a.is_default) || data[0];
      if (defaultAddr) {
        selectAddress(defaultAddr);
      }
    }
  };

  const selectAddress = (address: any) => {
    setSelectedAddressId(address.id);
    setValue("fullName", address.full_name);
    setValue("phone", address.phone);
    setValue("city", address.city.toLowerCase());
    setValue("neighborhood", address.neighborhood || "");
    setValue("streetAddress", address.street_address);
    setValue("additionalInfo", address.additional_info || "");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl text-cream">Adresse de livraison</h2>
          <p className="text-cream/60 text-sm">Où devons-nous livrer votre commande ?</p>
        </div>
      </div>

      {/* Saved Addresses */}
      {savedAddresses.length > 0 && (
        <div className="space-y-3 mb-6">
          <Label className="text-cream/80">Adresses enregistrées</Label>
          <div className="grid gap-3">
            {savedAddresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => selectAddress(addr)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedAddressId === addr.id
                    ? "border-primary bg-primary/10"
                    : "border-gold/20 bg-cream/5 hover:border-gold/40"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-cream">{addr.full_name}</p>
                    <p className="text-sm text-cream/60">{addr.street_address}</p>
                    <p className="text-sm text-cream/60">
                      {addr.neighborhood}, {addr.city}
                    </p>
                  </div>
                  {addr.is_default && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                      Par défaut
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-cream/80">
            Nom complet
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
            <Input
              id="fullName"
              {...register("fullName")}
              placeholder="Jean Dupont"
              className="pl-10 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
            />
          </div>
          {errors.fullName && (
            <p className="text-destructive text-sm">{errors.fullName.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-cream/80">
            Téléphone
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
            <Input
              id="phone"
              type="tel"
              {...register("phone")}
              placeholder="6 XX XX XX XX"
              className="pl-10 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
            />
          </div>
          {errors.phone && (
            <p className="text-destructive text-sm">{errors.phone.message}</p>
          )}
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label className="text-cream/80">Ville</Label>
          <Select value={city} onValueChange={(value) => setValue("city", value)}>
            <SelectTrigger className="bg-cream/5 border-gold/20 text-cream">
              <SelectValue placeholder="Sélectionnez une ville" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.city && (
            <p className="text-destructive text-sm">{errors.city.message}</p>
          )}
        </div>

        {/* Neighborhood */}
        <div className="space-y-2">
          <Label htmlFor="neighborhood" className="text-cream/80">
            Quartier
          </Label>
          <Input
            id="neighborhood"
            {...register("neighborhood")}
            placeholder="Bastos, Bonanjo..."
            className="bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
          />
          {errors.neighborhood && (
            <p className="text-destructive text-sm">{errors.neighborhood.message}</p>
          )}
        </div>

        {/* Street Address */}
        <div className="space-y-2">
          <Label htmlFor="streetAddress" className="text-cream/80">
            Adresse complète
          </Label>
          <Textarea
            id="streetAddress"
            {...register("streetAddress")}
            placeholder="Rue, numéro, immeuble, étage..."
            className="bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40 min-h-[80px]"
          />
          {errors.streetAddress && (
            <p className="text-destructive text-sm">{errors.streetAddress.message}</p>
          )}
        </div>

        {/* Additional Info */}
        <div className="space-y-2">
          <Label htmlFor="additionalInfo" className="text-cream/80">
            Instructions de livraison (optionnel)
          </Label>
          <Textarea
            id="additionalInfo"
            {...register("additionalInfo")}
            placeholder="Code d'accès, repères, heures de disponibilité..."
            className="bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40 min-h-[60px]"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-gold text-noir font-semibold h-12"
        >
          Continuer vers le paiement
        </Button>
      </form>
    </div>
  );
}
