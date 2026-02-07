import { useState, useEffect } from "react";
import { Calendar, Mail, Send, Clock, RefreshCw, Check, FileText, Save, Plus, X, Users, TestTube } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { ReportPreview } from "./ReportPreview";
import { ReportHistory } from "./ReportHistory";

// Frequency options for the report
const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Quotidien", description: "Tous les jours" },
  { value: "weekly", label: "Hebdomadaire", description: "Une fois par semaine" },
  { value: "biweekly", label: "Bi-mensuel", description: "Le 1er et 15 de chaque mois" },
  { value: "monthly", label: "Mensuel", description: "Le 1er de chaque mois" },
];

const DAY_OPTIONS = [
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
  { value: "0", label: "Dimanche" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: `${i.toString().padStart(2, "0")}:00`,
}));

// Build cron expression based on frequency settings
function buildCronExpression(frequency: string, day: string, hour: string): string {
  const hourNum = parseInt(hour);
  
  switch (frequency) {
    case "daily":
      return `0 ${hourNum} * * *`;
    case "weekly":
      return `0 ${hourNum} * * ${day}`;
    case "biweekly":
      return `0 ${hourNum} 1,15 * *`;
    case "monthly":
      return `0 ${hourNum} 1 * *`;
    default:
      return `0 ${hourNum} * * 1`;
  }
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function WeeklyReportSettings() {
  const { user } = useAuthContext();
  const { profile } = useProfile();
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [scheduleUpdated, setScheduleUpdated] = useState(false);
  const [frequency, setFrequency] = useState("weekly");
  const [selectedDay, setSelectedDay] = useState("1");
  const [selectedHour, setSelectedHour] = useState("8");
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testEmailError, setTestEmailError] = useState("");
  const [hasAddedCurrentUser, setHasAddedCurrentUser] = useState(false);

  // Get current user's email
  const currentUserEmail = profile?.email || user?.email;

  // Auto-add current user's email if no recipients configured (first load only)
  useEffect(() => {
    if (!hasAddedCurrentUser && currentUserEmail && recipientEmails.length === 0 && !isLoading) {
      setRecipientEmails([currentUserEmail.toLowerCase()]);
      setHasAddedCurrentUser(true);
    }
  }, [currentUserEmail, recipientEmails.length, isLoading, hasAddedCurrentUser]);

  // Pre-fill test email with current user's email
  useEffect(() => {
    if (currentUserEmail && !testEmail) {
      setTestEmail(currentUserEmail);
    }
  }, [currentUserEmail]);

  // Load existing configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("report_schedule_config")
          .select("*")
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error loading config:", error);
          return;
        }

        if (data) {
          setFrequency(data.frequency || "weekly");
          setSelectedDay(data.day_of_week || "1");
          setSelectedHour(data.hour?.toString() || "8");
          // Only set recipient emails if they exist in the config
          if (data.recipient_emails && data.recipient_emails.length > 0) {
            setRecipientEmails(data.recipient_emails);
            setHasAddedCurrentUser(true); // Don't auto-add if config exists
          }
        }
      } catch (error) {
        console.error("Error loading config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleAddEmail = () => {
    const trimmedEmail = newEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setEmailError("Veuillez entrer une adresse email");
      return;
    }
    
    if (!isValidEmail(trimmedEmail)) {
      setEmailError("Adresse email invalide");
      return;
    }
    
    if (recipientEmails.includes(trimmedEmail)) {
      setEmailError("Cette adresse est déjà dans la liste");
      return;
    }
    
    if (recipientEmails.length >= 10) {
      setEmailError("Maximum 10 destinataires autorisés");
      return;
    }
    
    setRecipientEmails([...recipientEmails, trimmedEmail]);
    setNewEmail("");
    setEmailError("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setRecipientEmails(recipientEmails.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleSendTest = async () => {
    const trimmedTestEmail = testEmail.trim().toLowerCase();
    
    if (!trimmedTestEmail) {
      setTestEmailError("Veuillez entrer une adresse email");
      return;
    }
    
    if (!isValidEmail(trimmedTestEmail)) {
      setTestEmailError("Adresse email invalide");
      return;
    }
    
    setTestEmailError("");
    setIsSendingTest(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-weekly-stock-report", {
        body: { testEmail: trimmedTestEmail },
      });

      if (error) throw error;

      toast.success("Email de test envoyé", {
        description: `Le rapport de test a été envoyé à ${trimmedTestEmail}`,
      });
      setTestEmail("");
    } catch (error) {
      console.error("Error sending test report:", error);
      toast.error("Erreur lors de l'envoi", {
        description: "Impossible d'envoyer l'email de test. Réessayez plus tard.",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendNow = async () => {
    setIsSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-weekly-stock-report", {
        body: { manual: true },
      });

      if (error) throw error;

      setLastSentAt(new Date());
      toast.success("Rapport envoyé avec succès", {
        description: `Le rapport a été envoyé à ${recipientEmails.length > 0 ? recipientEmails.length : 1} destinataire(s).`,
      });
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error("Erreur lors de l'envoi", {
        description: "Impossible d'envoyer le rapport. Réessayez plus tard.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    setScheduleUpdated(false);

    try {
      const cronExpression = buildCronExpression(frequency, selectedDay, selectedHour);
      
      const { data, error } = await supabase.functions.invoke("update-report-schedule", {
        body: {
          cronExpression,
          frequency,
          day: frequency === "weekly" ? selectedDay : undefined,
          hour: selectedHour,
          recipientEmails,
        },
      });

      if (error) throw error;

      setScheduleUpdated(true);
      toast.success("Planification mise à jour", {
        description: getCurrentScheduleDescription(),
      });

      setTimeout(() => setScheduleUpdated(false), 5000);
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Erreur lors de la mise à jour", {
        description: "Impossible de modifier la planification. Réessayez plus tard.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getCurrentScheduleDescription = () => {
    const day = DAY_OPTIONS.find(d => d.value === selectedDay);
    const hour = selectedHour.padStart(2, "0");

    switch (frequency) {
      case "daily":
        return `Tous les jours à ${hour}:00`;
      case "weekly":
        return `Chaque ${day?.label.toLowerCase()} à ${hour}:00`;
      case "biweekly":
        return `Le 1er et 15 de chaque mois à ${hour}:00`;
      case "monthly":
        return `Le 1er de chaque mois à ${hour}:00`;
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-noir/50 border-gold/20">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-cream/60">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Chargement de la configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Rapport hebdomadaire de stock
        </CardTitle>
        <CardDescription className="text-cream/60">
          Envoi automatique par email d'un résumé du stock et des alertes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Schedule Info */}
        <div className="bg-cream/5 border border-gold/10 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-cream mb-1">
                Planification actuelle
              </h4>
              <p className="text-sm text-cream/70">
                {getCurrentScheduleDescription()}
              </p>
              <p className="text-xs text-cream/50 mt-2">
                Le rapport inclut : statistiques de stock, produits en alerte, tendances et recommandations.
              </p>
            </div>
          </div>
        </div>

        {/* Recipients Management */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <Label className="text-cream font-medium">Destinataires du rapport</Label>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Ajouter une adresse email..."
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setEmailError("");
                }}
                onKeyPress={handleKeyPress}
                className="bg-noir border-gold/30 text-cream placeholder:text-cream/40"
              />
            </div>
            <Button
              type="button"
              onClick={handleAddEmail}
              variant="outline"
              className="border-gold/30 hover:bg-cream/5 text-cream px-3"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {emailError && (
            <p className="text-sm text-red-400">{emailError}</p>
          )}
          
          {/* Email list */}
          <div className="flex flex-wrap gap-2">
            {recipientEmails.length === 0 ? (
              <p className="text-sm text-cream/50 italic">
                Aucun destinataire configuré.
              </p>
            ) : (
              recipientEmails.map((email) => (
                <Badge
                  key={email}
                  variant="secondary"
                  className="bg-cream/10 text-cream border-gold/20 px-3 py-1.5 flex items-center gap-2"
                >
                  <Mail className="h-3 w-3" />
                  {email}
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    className="ml-1 hover:text-red-400 transition-colors"
                    aria-label={`Supprimer ${email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          
          {recipientEmails.length > 0 && (
            <p className="text-xs text-cream/50">
              {recipientEmails.length} destinataire(s) configuré(s) • Maximum 10
            </p>
          )}
        </div>

        {/* Frequency Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Frequency */}
          <div className="space-y-2">
            <Label className="text-cream">Fréquence</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="bg-noir border-gold/30 text-cream">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-noir border-gold/30">
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-cream hover:bg-cream/10"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day of week (only for weekly) */}
          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label className="text-cream">Jour d'envoi</Label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger className="bg-noir border-gold/30 text-cream">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-noir border-gold/30">
                  {DAY_OPTIONS.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className="text-cream hover:bg-cream/10"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Hour */}
          <div className="space-y-2">
            <Label className="text-cream">Heure d'envoi</Label>
            <Select value={selectedHour} onValueChange={setSelectedHour}>
              <SelectTrigger className="bg-noir border-gold/30 text-cream">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-noir border-gold/30 max-h-[200px]">
                {HOUR_OPTIONS.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-cream hover:bg-cream/10"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Save Schedule Button */}
        <Button
          onClick={handleSaveSchedule}
          disabled={isSaving}
          variant="outline"
          className="w-full border-gold/30 hover:bg-cream/5 text-cream"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Mise à jour en cours...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer la planification
            </>
          )}
        </Button>

        {/* Schedule update success */}
        {scheduleUpdated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg"
          >
            <Check className="h-5 w-5 text-primary" />
            <span className="text-primary text-sm">
              Planification mise à jour : {getCurrentScheduleDescription()}
            </span>
          </motion.div>
        )}

        {/* Test Email Section */}
        <div className="bg-cream/5 border border-gold/10 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TestTube className="h-4 w-4 text-primary" />
            <Label className="text-cream font-medium">Envoyer un email de test</Label>
          </div>
          <p className="text-xs text-cream/50">
            Testez le rapport en l'envoyant à une seule adresse avant l'envoi global. 
            L'email de test ne sera pas enregistré dans l'historique.
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="votre-email@exemple.com"
                value={testEmail}
                onChange={(e) => {
                  setTestEmail(e.target.value);
                  setTestEmailError("");
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendTest();
                  }
                }}
                className="bg-noir border-gold/30 text-cream placeholder:text-cream/40"
              />
            </div>
            <Button
              onClick={handleSendTest}
              disabled={isSendingTest || !testEmail.trim()}
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary/10"
            >
              {isSendingTest ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Tester
                </>
              )}
            </Button>
          </div>
          {testEmailError && (
            <p className="text-sm text-red-400">{testEmailError}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gold/10">
          <ReportPreview />
          <Button
            onClick={handleSendNow}
            disabled={isSending}
            className="bg-gradient-gold text-noir font-semibold hover:opacity-90 flex-1"
          >
            {isSending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer le rapport maintenant
              </>
            )}
          </Button>
        </div>

        {/* Last sent info */}
        {lastSentAt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
          >
            <Check className="h-5 w-5 text-green-500" />
            <span className="text-green-400 text-sm">
              Rapport envoyé le {lastSentAt.toLocaleDateString("fr-FR")} à{" "}
              {lastSentAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </motion.div>
        )}

        {/* Report History */}
        <div className="pt-4 border-t border-gold/10">
          <ReportHistory />
        </div>
      </CardContent>
    </Card>
  );
}
