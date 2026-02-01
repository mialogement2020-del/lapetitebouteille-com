import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, User, Phone, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Address = Tables<"addresses">;

const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Nom complet requis").max(100),
  phone: z.string().trim().min(9, "Numéro de téléphone invalide").max(20),
  city: z.string().min(1, "Ville requise"),
  neighborhood: z.string().trim().max(100).optional(),
  streetAddress: z.string().trim().min(5, "Adresse complète requise").max(200),
  additionalInfo: z.string().max(500).optional(),
});

export type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormProps {
  onSubmit: (data: AddressFormData) => void;
  isLoading?: boolean;
}

const CITIES = [
  "Douala",
  "Yaoundé",
  "Bamenda",
  "Bafoussam",
  "Garoua",
  "Maroua",
  "Ngaoundéré",
  "Bertoua",
  "Kribi",
  "Limbe",
  "Buea",
  "Ebolowa",
];

export function AddressForm({ onSubmit, isLoading }: AddressFormProps) {
  const { user } = useAuthContext();
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
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
    } else {
      setLoadingAddresses(false);
      setShowNewAddressForm(true);
    }
  }, [user?.id]);

  const fetchSavedAddresses = async () => {
    if (!user?.id) return;
    
    setLoadingAddresses(true);
    try {
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setSavedAddresses(data);
        // Auto-select default address
        const defaultAddr = data.find((a) => a.is_default) || data[0];
        if (defaultAddr) {
          selectAddress(defaultAddr);
        }
      } else {
        setShowNewAddressForm(true);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
      setShowNewAddressForm(true);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const selectAddress = (address: Address) => {
    setSelectedAddressId(address.id);
    setShowNewAddressForm(false);
    setValue("fullName", address.full_name);
    setValue("phone", address.phone);
    setValue("city", address.city);
    setValue("neighborhood", address.neighborhood || "");
    setValue("streetAddress", address.street_address);
    setValue("additionalInfo", address.additional_info || "");
  };

  const handleNewAddressClick = () => {
    setSelectedAddressId(null);
    setShowNewAddressForm(true);
    reset({
      fullName: "",
      phone: "",
      city: "Douala",
      neighborhood: "",
      streetAddress: "",
      additionalInfo: "",
    });
  };

  const handleFormSubmit = async (data: AddressFormData) => {
    // Save new address if user is authenticated and wants to save it
    if (user?.id && showNewAddressForm && saveNewAddress) {
      try {
        await supabase.from("addresses").insert({
          user_id: user.id,
          full_name: data.fullName,
          phone: data.phone,
          city: data.city,
          neighborhood: data.neighborhood || null,
          street_address: data.streetAddress,
          additional_info: data.additionalInfo || null,
          is_default: savedAddresses.length === 0, // Set as default if first address
        });
      } catch (error) {
        console.error("Failed to save address:", error);
      }
    }
    
    onSubmit(data);
  };

  if (loadingAddresses) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

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
          <Label className="text-cream/80">Mes adresses enregistrées</Label>
          <div className="grid gap-3">
            {savedAddresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => selectAddress(addr)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedAddressId === addr.id && !showNewAddressForm
                    ? "border-primary bg-primary/10"
                    : "border-gold/20 bg-cream/5 hover:border-gold/40"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      selectedAddressId === addr.id && !showNewAddressForm
                        ? "border-primary bg-primary"
                        : "border-cream/40"
                    }`}>
                      {selectedAddressId === addr.id && !showNewAddressForm && (
                        <Check className="h-3 w-3 text-noir" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-cream">{addr.full_name}</p>
                      <p className="text-sm text-cream/60">{addr.phone}</p>
                      <p className="text-sm text-cream/60">{addr.street_address}</p>
                      <p className="text-sm text-cream/60">
                        {addr.neighborhood ? `${addr.neighborhood}, ` : ""}{addr.city}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {addr.is_default && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        Par défaut
                      </span>
                    )}
                    {addr.label && (
                      <span className="text-xs text-cream/40">{addr.label}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Add New Address Option */}
            <button
              type="button"
              onClick={handleNewAddressClick}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                showNewAddressForm
                  ? "border-primary bg-primary/10"
                  : "border-gold/20 border-dashed bg-cream/5 hover:border-gold/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  showNewAddressForm
                    ? "border-primary bg-primary"
                    : "border-cream/40"
                }`}>
                  {showNewAddressForm ? (
                    <Check className="h-3 w-3 text-noir" />
                  ) : (
                    <Plus className="h-3 w-3 text-cream/40" />
                  )}
                </div>
                <span className={showNewAddressForm ? "text-cream font-medium" : "text-cream/60"}>
                  Utiliser une nouvelle adresse
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Address Form */}
      {(showNewAddressForm || savedAddresses.length === 0) && (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {savedAddresses.length > 0 && (
            <div className="pb-4 border-b border-gold/20">
              <h3 className="text-cream font-medium mb-1">Nouvelle adresse</h3>
              <p className="text-cream/60 text-sm">Entrez les détails de livraison</p>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-cream/80">
              Nom complet *
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
              Téléphone *
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="+237 6XX XXX XXX"
                className="pl-10 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
              />
            </div>
            {errors.phone && (
              <p className="text-destructive text-sm">{errors.phone.message}</p>
            )}
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label className="text-cream/80">Ville *</Label>
            <Select value={city} onValueChange={(value) => setValue("city", value)}>
              <SelectTrigger className="bg-cream/5 border-gold/20 text-cream">
                <SelectValue placeholder="Sélectionnez une ville" />
              </SelectTrigger>
              <SelectContent className="bg-noir border-gold/30">
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-cream hover:bg-cream/10">
                    {c}
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
              placeholder="Akwa, Bonanjo, Bastos..."
              className="bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
            />
            {errors.neighborhood && (
              <p className="text-destructive text-sm">{errors.neighborhood.message}</p>
            )}
          </div>

          {/* Street Address */}
          <div className="space-y-2">
            <Label htmlFor="streetAddress" className="text-cream/80">
              Adresse complète *
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

          {/* Save Address Option */}
          {user?.id && showNewAddressForm && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-cream/5 border border-gold/10">
              <Checkbox
                id="saveAddress"
                checked={saveNewAddress}
                onCheckedChange={(checked) => setSaveNewAddress(checked === true)}
                className="border-gold/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="saveAddress" className="text-cream/80 font-normal cursor-pointer">
                Enregistrer cette adresse pour mes prochaines commandes
              </Label>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-gold text-noir font-semibold h-12"
          >
            Continuer vers le paiement
          </Button>
        </form>
      )}

      {/* Submit Button for Selected Saved Address */}
      {!showNewAddressForm && selectedAddressId && (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-gold text-noir font-semibold h-12"
          >
            Continuer vers le paiement
          </Button>
        </form>
      )}
    </div>
  );
}
