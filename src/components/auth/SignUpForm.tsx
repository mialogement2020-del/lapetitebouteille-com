import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, User, Mail, Phone, Calendar, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";

export function SignUpForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuthContext();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    referralCode: searchParams.get("ref") || "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const parseDate = (dateStr: string): Date | null => {
    // Parse DD/MM/YYYY format
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (year < 1900 || year > new Date().getFullYear()) return null;
    if (month < 0 || month > 11) return null;
    if (day < 1 || day > 31) return null;
    return new Date(year, month, day);
  };

  const calculateAge = (dateOfBirth: string): number => {
    const birthDate = parseDate(dateOfBirth);
    if (!birthDate) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDateInput = (value: string): string => {
    // Remove non-numeric characters
    const numbers = value.replace(/\D/g, "");
    // Format as DD/MM/YYYY
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setFormData((prev) => ({ ...prev, dateOfBirth: formatted }));
  };

  const isValidDateFormat = (dateStr: string): boolean => {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr) && parseDate(dateStr) !== null;
  };

  const isOver18 = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) >= 18 : false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!formData.dateOfBirth || !isValidDateFormat(formData.dateOfBirth)) {
      toast({
        title: "Date de naissance requise",
        description: "Veuillez entrer une date valide au format JJ/MM/AAAA.",
        variant: "destructive",
      });
      return;
    }

    if (!isOver18) {
      toast({
        title: "Âge minimum requis",
        description: "Vous devez avoir au moins 18 ans pour vous inscrire.",
        variant: "destructive",
      });
      return;
    }

    if (!ageConfirmed) {
      toast({
        title: "Confirmation requise",
        description: "Veuillez confirmer que vous avez 18 ans ou plus.",
        variant: "destructive",
      });
      return;
    }

    if (!termsAccepted) {
      toast({
        title: "Conditions requises",
        description: "Veuillez accepter les conditions d'utilisation.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Mots de passe différents",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(formData.email, formData.password, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth,
      referralCode: formData.referralCode || undefined,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Inscription réussie !",
      description: "Veuillez vérifier votre email pour confirmer votre compte.",
    });

    navigate("/connexion?registered=true");
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    
    if (error) {
      setIsGoogleLoading(false);
      toast({
        title: "Erreur d'inscription",
        description: "Impossible de s'inscrire avec Google. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Google Sign-Up Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignUp}
        disabled={isGoogleLoading || isLoading}
        className="w-full border-gold/30 text-cream hover:bg-cream/10 h-12 mb-4"
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        S'inscrire avec Google
      </Button>

      {/* Separator */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gold/20" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-noir px-2 text-cream/50">ou</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nom et Prénom */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-cream/80">Prénom</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Jean"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-cream/80">Nom</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Dupont"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-cream/80">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="jean@exemple.com"
            value={formData.email}
            onChange={handleChange}
            required
            className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
          />
        </div>
      </div>

      {/* Téléphone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-cream/80">Téléphone</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+237 6XX XXX XXX"
            value={formData.phone}
            onChange={handleChange}
            className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
          />
        </div>
      </div>

      {/* Date de naissance */}
      <div className="space-y-2">
        <Label htmlFor="dateOfBirth" className="text-cream/80">
          Date de naissance <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="text"
            placeholder="JJ/MM/AAAA"
            value={formData.dateOfBirth}
            onChange={handleDateChange}
            required
            maxLength={10}
            className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
          />
        </div>
        {formData.dateOfBirth && formData.dateOfBirth.length === 10 && !isValidDateFormat(formData.dateOfBirth) && (
          <p className="text-destructive text-sm">
            Format invalide. Utilisez JJ/MM/AAAA.
          </p>
        )}
        {formData.dateOfBirth && isValidDateFormat(formData.dateOfBirth) && !isOver18 && (
          <p className="text-destructive text-sm">
            Vous devez avoir au moins 18 ans pour vous inscrire.
          </p>
        )}
      </div>

      {/* Mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-cream/80">Mot de passe</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            className="pr-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/50 hover:text-cream"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Confirmer mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-cream/80">Confirmer le mot de passe</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="pr-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/50 hover:text-cream"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Code parrain */}
      <div className="space-y-2">
        <Label htmlFor="referralCode" className="text-cream/80">
          Code parrain <span className="text-cream/40">(optionnel)</span>
        </Label>
        <div className="relative">
          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
          <Input
            id="referralCode"
            name="referralCode"
            type="text"
            placeholder="ABC123"
            value={formData.referralCode}
            onChange={handleChange}
            className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary uppercase"
          />
        </div>
        <p className="text-cream/40 text-xs">
          Avez-vous été recommandé par quelqu'un ? Entrez son code.
        </p>
      </div>

      {/* Confirmation âge */}
      <div className="flex items-start space-x-3 p-4 bg-secondary/20 rounded-lg border border-secondary/30">
        <Checkbox
          id="ageConfirmed"
          checked={ageConfirmed}
          onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
          className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
        />
        <label htmlFor="ageConfirmed" className="text-sm text-cream/80 cursor-pointer">
          Je confirme avoir <strong className="text-primary">18 ans ou plus</strong> et être autorisé(e) à acheter des boissons alcoolisées au Cameroun.
        </label>
      </div>

      {/* Conditions d'utilisation */}
      <div className="flex items-start space-x-3">
        <Checkbox
          id="termsAccepted"
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
          className="border-gold/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
        />
        <label htmlFor="termsAccepted" className="text-sm text-cream/60 cursor-pointer">
          J'accepte les{" "}
          <Link to="/conditions" className="text-primary hover:underline">
            conditions d'utilisation
          </Link>{" "}
          et la{" "}
          <Link to="/confidentialite" className="text-primary hover:underline">
            politique de confidentialité
          </Link>
          .
        </label>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || !isOver18}
        className="w-full bg-gradient-gold text-noir font-semibold hover:opacity-90 h-12"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Inscription en cours...
          </>
        ) : (
          "Créer mon compte"
        )}
      </Button>

      {/* Link to login */}
      <p className="text-center text-cream/60">
        Déjà un compte ?{" "}
        <Link to="/connexion" className="text-primary hover:underline font-medium">
          Se connecter
        </Link>
      </p>
      </form>
    </motion.div>
  );
}
