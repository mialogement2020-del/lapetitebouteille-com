import { useState } from "react";
import { Calendar, Mail, Send, Clock, RefreshCw, Check, FileText, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
      return `0 ${hourNum} * * *`; // Every day at specified hour
    case "weekly":
      return `0 ${hourNum} * * ${day}`; // Every week on specified day at specified hour
    case "biweekly":
      return `0 ${hourNum} 1,15 * *`; // 1st and 15th of each month at specified hour
    case "monthly":
      return `0 ${hourNum} 1 * *`; // 1st of each month at specified hour
    default:
      return `0 ${hourNum} * * 1`; // Default to weekly on Monday
  }
}

export function WeeklyReportSettings() {
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [scheduleUpdated, setScheduleUpdated] = useState(false);
  const [frequency, setFrequency] = useState("weekly");
  const [selectedDay, setSelectedDay] = useState("1");
  const [selectedHour, setSelectedHour] = useState("8");

  const handleSendNow = async () => {
    setIsSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-weekly-stock-report", {
        body: { manual: true },
      });

      if (error) throw error;

      setLastSentAt(new Date());
      toast.success("Rapport envoyé avec succès", {
        description: "Le rapport de stock a été envoyé par email.",
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
        },
      });

      if (error) throw error;

      setScheduleUpdated(true);
      toast.success("Planification mise à jour", {
        description: getCurrentScheduleDescription(),
      });

      // Reset the success indicator after 5 seconds
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gold/10">
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

        {/* Email destination info */}
        <div className="flex items-center gap-2 text-sm text-cream/60">
          <Mail className="h-4 w-4" />
          <span>
            Le rapport est envoyé à l'adresse configurée dans les paramètres (OWNER_EMAIL)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
