import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type Address = Tables<"addresses">;

const addressSchema = z.object({
  label: z.string().min(1, "Le libellé est requis").max(50, "Maximum 50 caractères"),
  full_name: z.string().trim().min(2, "Le nom complet est requis").max(100, "Maximum 100 caractères"),
  phone: z.string().trim().min(9, "Numéro de téléphone invalide").max(20, "Maximum 20 caractères"),
  street_address: z.string().trim().min(5, "L'adresse est requise").max(200, "Maximum 200 caractères"),
  neighborhood: z.string().trim().max(100, "Maximum 100 caractères").optional().nullable(),
  city: z.string().trim().min(2, "La ville est requise").max(100, "Maximum 100 caractères"),
  additional_info: z.string().trim().max(500, "Maximum 500 caractères").optional().nullable(),
  is_default: z.boolean().optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Address, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  initialData?: Address;
  title: string;
}

const cameroonCities = [
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

export function AddressFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title,
}: AddressFormDialogProps) {
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "Domicile",
      full_name: "",
      phone: "",
      street_address: "",
      neighborhood: "",
      city: "Douala",
      additional_info: "",
      is_default: false,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        label: initialData.label || "Domicile",
        full_name: initialData.full_name,
        phone: initialData.phone,
        street_address: initialData.street_address,
        neighborhood: initialData.neighborhood || "",
        city: initialData.city,
        additional_info: initialData.additional_info || "",
        is_default: initialData.is_default || false,
      });
    } else {
      form.reset({
        label: "Domicile",
        full_name: "",
        phone: "",
        street_address: "",
        neighborhood: "",
        city: "Douala",
        additional_info: "",
        is_default: false,
      });
    }
  }, [initialData, form, open]);

  const handleSubmit = async (values: AddressFormValues) => {
    await onSubmit({
      label: values.label,
      full_name: values.full_name,
      phone: values.phone,
      street_address: values.street_address,
      neighborhood: values.neighborhood || null,
      city: values.city,
      additional_info: values.additional_info || null,
      is_default: values.is_default || false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/30 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-cream">{title}</DialogTitle>
          <DialogDescription className="text-cream/60">
            Remplissez les informations de livraison
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Label */}
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-cream/80">Type d'adresse</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-cream/10 border-gold/30 text-cream">
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-noir border-gold/30">
                      <SelectItem value="Domicile" className="text-cream hover:bg-cream/10">
                        Domicile
                      </SelectItem>
                      <SelectItem value="Bureau" className="text-cream hover:bg-cream/10">
                        Bureau
                      </SelectItem>
                      <SelectItem value="Autre" className="text-cream hover:bg-cream/10">
                        Autre
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Full Name */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-cream/80">Nom complet *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Jean Dupont"
                      className="bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-cream/80">Téléphone *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      placeholder="+237 6XX XXX XXX"
                      className="bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Street Address */}
            <FormField
              control={form.control}
              name="street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-cream/80">Adresse complète *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="123 Rue de l'Indépendance"
                      className="bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Neighborhood */}
            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-cream/80">Quartier</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="Akwa, Bonanjo, etc."
                      className="bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-cream/80">Ville *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-cream/10 border-gold/30 text-cream">
                        <SelectValue placeholder="Sélectionner une ville" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-noir border-gold/30">
                      {cameroonCities.map((city) => (
                        <SelectItem
                          key={city}
                          value={city}
                          className="text-cream hover:bg-cream/10"
                        >
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Info */}
            <FormField
              control={form.control}
              name="additional_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-cream/80">Informations complémentaires</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Indications pour le livreur (étage, code, etc.)"
                      className="bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 resize-none"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Default */}
            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0 p-3 rounded-lg bg-cream/5 border border-gold/10">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-gold/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </FormControl>
                  <FormLabel className="text-cream/80 font-normal cursor-pointer">
                    Définir comme adresse par défaut
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-gold/30 text-cream hover:bg-cream/10"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary text-noir hover:bg-primary/90"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
