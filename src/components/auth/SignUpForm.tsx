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
import { useTranslation } from "react-i18next";

export function SignUpForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuthContext();
  const { t } = useTranslation();
  
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
  const [isAppleLoading, setIsAppleLoading] = useState(false);

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
        title: t("signup.dobRequiredTitle"),
        description: t("signup.dobRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!isOver18) {
      toast({
        title: t("signup.ageRequiredTitle"),
        description: t("signup.ageRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!ageConfirmed) {
      toast({
        title: t("signup.ageConfirmTitle"),
        description: t("signup.ageConfirmDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!termsAccepted) {
      toast({
        title: t("signup.termsRequiredTitle"),
        description: t("signup.termsRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t("signup.passwordMismatchTitle"),
        description: t("signup.passwordMismatchDesc"),
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: t("signup.passwordShortTitle"),
        description: t("signup.passwordShortDesc"),
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
        title: t("signup.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("signup.successTitle"),
      description: t("signup.successDesc"),
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
        title: t("signup.errorTitle"),
        description: t("signup.errorGoogle"),
        variant: "destructive",
      });
    }
  };

  const handleAppleSignUp = async () => {
    setIsAppleLoading(true);
    
    const { error } = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    
    if (error) {
      setIsAppleLoading(false);
      toast({
        title: t("signup.errorTitle"),
        description: t("signup.errorApple"),
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
        disabled={isGoogleLoading || isAppleLoading || isLoading}
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
        {t("auth.signupGoogle")}
      </Button>

      {/* Apple Sign-Up Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAppleSignUp}
        disabled={isGoogleLoading || isAppleLoading || isLoading}
        className="w-full border-gold/30 text-cream hover:bg-cream/10 h-12 mb-4"
      >
        {isAppleLoading ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        )}
        {t("auth.signupApple")}
      </Button>

      {/* Separator */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gold/20" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-noir px-2 text-cream/50">{t("auth.or")}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nom et Prénom */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-cream/80">{t("auth.firstName")}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder={t("signup.firstNamePlaceholder")}
              value={formData.firstName}
              onChange={handleChange}
              required
              className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-cream/80">{t("auth.lastName")}</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            placeholder={t("signup.lastNamePlaceholder")}
            value={formData.lastName}
            onChange={handleChange}
            required
            className="bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-cream/80">{t("auth.email")}</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t("signup.emailPlaceholder")}
            value={formData.email}
            onChange={handleChange}
            required
            className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
          />
        </div>
      </div>

      {/* Téléphone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-cream/80">{t("auth.phone")}</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder={t("signup.phonePlaceholder")}
            value={formData.phone}
            onChange={handleChange}
            className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
          />
        </div>
      </div>

      {/* Date de naissance */}
      <div className="space-y-2">
        <Label htmlFor="dateOfBirth" className="text-cream/80">
          {t("auth.dateOfBirth")} <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="text"
            placeholder={t("signup.dobPlaceholder")}
            value={formData.dateOfBirth}
            onChange={handleDateChange}
            required
            maxLength={10}
            className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
          />
        </div>
        {formData.dateOfBirth && formData.dateOfBirth.length === 10 && !isValidDateFormat(formData.dateOfBirth) && (
          <p className="text-destructive text-sm">
            {t("signup.dobInvalidFormat")}
          </p>
        )}
        {formData.dateOfBirth && isValidDateFormat(formData.dateOfBirth) && !isOver18 && (
          <p className="text-destructive text-sm">
            {t("signup.ageMinError")}
          </p>
        )}
      </div>

      {/* Mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-cream/80">{t("auth.password")}</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder={t("signup.passwordPlaceholder")}
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
        <Label htmlFor="confirmPassword" className="text-cream/80">{t("auth.confirmPassword")}</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder={t("signup.passwordPlaceholder")}
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
          {t("auth.referralCode")} <span className="text-cream/40">{t("auth.optional")}</span>
        </Label>
        <div className="relative">
          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
          <Input
            id="referralCode"
            name="referralCode"
            type="text"
            placeholder={t("signup.referralPlaceholder")}
            value={formData.referralCode}
            onChange={handleChange}
            className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary uppercase"
          />
        </div>
        <p className="text-cream/40 text-xs">
          {t("auth.referralHint")}
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
          {t("signup.ageConfirmBefore")} <strong className="text-primary">{t("signup.ageConfirmStrong")}</strong> {t("signup.ageConfirmAfter")}
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
          {t("signup.termsPrefix")}{" "}
          <Link to="/conditions" className="text-primary hover:underline">
            {t("signup.termsLink")}
          </Link>{" "}
          {t("signup.termsAnd")}{" "}
          <Link to="/confidentialite" className="text-primary hover:underline">
            {t("signup.privacyLink")}
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
            {t("signup.submitting")}
          </>
        ) : (
          t("signup.submit")
        )}
      </Button>

      {/* Link to login */}
      <p className="text-center text-cream/60">
        {t("signup.haveAccount")}{" "}
        <Link to="/connexion" className="text-primary hover:underline font-medium">
          {t("signup.signIn")}
        </Link>
      </p>
      </form>
    </motion.div>
  );
}
