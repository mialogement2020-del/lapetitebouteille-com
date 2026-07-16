import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";

const db = supabase as any;

type AcademyCourse = {
  course_id: string;
  path_id: string | null;
  path_title: string | null;
  title: string;
  slug: string;
  description: string | null;
  course_type: string;
  level: string;
  estimated_minutes: number;
  skills: string[];
  pass_score: number;
  user_status: string;
  progress_percent: number;
  score: number | null;
};

type AcademySummary = {
  total_courses: number;
  completed_courses: number;
  in_progress_courses: number;
  global_progress_percent: number;
  skills_acquired: string[];
  issued_certifications: number;
  pending_certifications: number;
};

type AcademyCertification = {
  certification_id: string;
  title: string;
  description: string | null;
  minimum_score: number;
  requires_manual_validation: boolean;
  user_status: string;
  score: number | null;
  issued_at: string | null;
  certificate_code: string | null;
};

type AcademyReportRow = {
  course_id: string;
  title: string;
  course_type: string;
  level: string;
  enrolled_users: number;
  completed_users: number;
  failed_users: number;
  average_score: number;
  completion_rate: number;
};

type LearningPath = {
  id: string;
  title: string;
  slug: string;
};

const statusLabels: Record<string, string> = {
  not_started: "A commencer",
  in_progress: "En cours",
  completed: "Termine",
  failed: "A reprendre",
  skipped: "Ignore",
  issued: "Delivre",
  pending_validation: "Validation admin",
  not_eligible: "Non obtenu",
  revoked: "Revoque",
};

const statusTone: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  issued: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  pending_validation: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
  revoked: "bg-red-500/15 text-red-300 border-red-500/30",
};

const emptySummary: AcademySummary = {
  total_courses: 0,
  completed_courses: 0,
  in_progress_courses: 0,
  global_progress_percent: 0,
  skills_acquired: [],
  issued_certifications: 0,
  pending_certifications: 0,
};

const formatPercent = (value: number | null | undefined) => `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AcademyCertificationDashboard() {
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [summary, setSummary] = useState<AcademySummary>(emptySummary);
  const [certifications, setCertifications] = useState<AcademyCertification[]>([]);
  const [report, setReport] = useState<AcademyReportRow[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPathId, setDraftPathId] = useState<string>("");
  const [draftType, setDraftType] = useState("text");
  const [draftLevel, setDraftLevel] = useState("beginner");
  const [draftPassScore, setDraftPassScore] = useState("75");

  const completedCount = useMemo(
    () => courses.filter((course) => course.user_status === "completed").length,
    [courses],
  );

  const loadData = async () => {
    setIsLoading(true);
    const [coursesResult, summaryResult, certsResult, reportResult, pathsResult] = await Promise.all([
      db.from("advisor_academy_dashboard").select("*"),
      db.from("advisor_academy_summary").select("*").maybeSingle(),
      db.from("advisor_academy_certifications").select("*"),
      db.from("admin_academy_report").select("*"),
      db.from("academy_learning_paths").select("id,title,slug").order("title", { ascending: true }),
    ]);

    if (coursesResult.error) {
      toast({ title: "Erreur Academy", description: coursesResult.error.message, variant: "destructive" });
    } else {
      setCourses(coursesResult.data || []);
    }

    if (!summaryResult.error && summaryResult.data) {
      setSummary(summaryResult.data);
    }

    if (!certsResult.error) {
      setCertifications(certsResult.data || []);
    }

    if (!reportResult.error) {
      setReport(reportResult.data || []);
    }

    if (!pathsResult.error) {
      const nextPaths = pathsResult.data || [];
      setPaths(nextPaths);
      setDraftPathId((current) => current || nextPaths[0]?.id || "");
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const startCourse = async (courseId: string) => {
    const { error } = await db.rpc("academy_start_course", { _course_id: courseId });
    if (error) {
      toast({ title: "Demarrage impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cours demarre", description: "La progression a ete enregistree." });
    await loadData();
  };

  const completeCourse = async (courseId: string, score: number) => {
    const { error } = await db.rpc("academy_complete_course", {
      _course_id: courseId,
      _score: score,
      _skills: [],
    });
    if (error) {
      toast({ title: "Validation impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: score >= 70 ? "Cours valide" : "Cours a reprendre", description: "Le resultat a ete enregistre." });
    await loadData();
  };

  const createCourse = async () => {
    if (!draftTitle.trim()) {
      toast({ title: "Titre obligatoire", description: "Ajoutez un titre de cours.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { error } = await db.from("academy_courses").insert({
      path_id: draftPathId || null,
      title: draftTitle.trim(),
      slug: slugify(draftTitle),
      description: draftDescription.trim() || null,
      course_type: draftType,
      level: draftLevel,
      pass_score: Number(draftPassScore || 75),
      is_published: false,
      is_active: true,
      content: {
        formats: [draftType],
        created_from: "admin_academy_dashboard",
      },
    });

    setIsSaving(false);

    if (error) {
      toast({ title: "Creation impossible", description: error.message, variant: "destructive" });
      return;
    }

    setDraftTitle("");
    setDraftDescription("");
    toast({ title: "Cours cree", description: "Il reste en brouillon tant qu'il n'est pas publie." });
    await loadData();
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement de LPB Academy...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">LPB Academy & Certification</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Parcours de formation, quiz, certifications et suivi de progression des conseillers LPB.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="border-gold/30">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-gold/20 bg-noir/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4 text-primary" />
              Progression globale
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-cream">{formatPercent(summary.global_progress_percent)}</CardContent>
        </Card>
        <Card className="border-gold/20 bg-noir/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Modules termines
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-cream">
            {completedCount}/{summary.total_courses}
          </CardContent>
        </Card>
        <Card className="border-gold/20 bg-noir/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="h-4 w-4 text-primary" />
              Certificats obtenus
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-cream">{summary.issued_certifications}</CardContent>
        </Card>
        <Card className="border-gold/20 bg-noir/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-blue-300" />
              En validation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-cream">{summary.pending_certifications}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="learning" className="space-y-6">
        <TabsList className="border border-gold/20 bg-noir/70">
          <TabsTrigger value="learning">Mon parcours</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="admin">Admin Academy</TabsTrigger>
        </TabsList>

        <TabsContent value="learning" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {courses.map((course) => (
              <Card key={course.course_id} className="border-gold/20 bg-noir/60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-cream">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {course.title}
                      </CardTitle>
                      <CardDescription>{course.path_title || "Parcours libre"} - {course.estimated_minutes} min</CardDescription>
                    </div>
                    <Badge className={statusTone[course.user_status] || "border-gold/30 bg-gold/10 text-primary"}>
                      {statusLabels[course.user_status] || course.user_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-gold/30">{course.course_type}</Badge>
                    <Badge variant="outline" className="border-gold/30">{course.level}</Badge>
                    <Badge variant="outline" className="border-gold/30">Score min {course.pass_score}%</Badge>
                    {(course.skills || []).slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Number(course.progress_percent || 0))}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => startCourse(course.course_id)}>
                      <Play className="mr-2 h-4 w-4" />
                      Reprendre
                    </Button>
                    <Button onClick={() => completeCourse(course.course_id, 90)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Valider test
                    </Button>
                    <Button variant="destructive" onClick={() => completeCourse(course.course_id, 40)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Simuler echec
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="certifications" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {certifications.map((certification) => (
              <Card key={certification.certification_id} className="border-gold/20 bg-noir/60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-cream">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        {certification.title}
                      </CardTitle>
                      <CardDescription>{certification.description}</CardDescription>
                    </div>
                    <Badge className={statusTone[certification.user_status] || "border-gold/30 bg-gold/10 text-primary"}>
                      {statusLabels[certification.user_status] || certification.user_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Score minimum : {formatPercent(certification.minimum_score)}</p>
                  <p>Validation : {certification.requires_manual_validation ? "admin requise" : "automatique"}</p>
                  {certification.certificate_code ? <p>Code : {certification.certificate_code}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <Plus className="h-5 w-5 text-primary" />
                Creer un cours
              </CardTitle>
              <CardDescription>Le cours reste non publie par defaut afin de le relire avant ouverture aux conseillers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Expert Champagne - niveau 1" />
              </div>
              <div className="space-y-2">
                <Label>Parcours</Label>
                <Select value={draftPathId} onValueChange={setDraftPathId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un parcours" />
                  </SelectTrigger>
                  <SelectContent>
                    {paths.map((path) => (
                      <SelectItem key={path.id} value={path.id}>{path.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} placeholder="Objectif, public cible, competences visees..." />
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={draftType} onValueChange={setDraftType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["text", "video", "pdf", "quiz", "exercise", "case_study", "simulation", "resource"].map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Niveau</Label>
                <Select value={draftLevel} onValueChange={setDraftLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["beginner", "intermediate", "advanced", "expert"].map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Score minimum</Label>
                <Input type="number" min="0" max="100" value={draftPassScore} onChange={(event) => setDraftPassScore(event.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={createCourse} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Creer le brouillon
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <BarChart3 className="h-5 w-5 text-primary" />
                Statistiques Academy
              </CardTitle>
              <CardDescription>Taux de reussite et progression par cours.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-gold/10">
                    <th className="py-3">Cours</th>
                    <th>Format</th>
                    <th>Niveau</th>
                    <th>Inscrits</th>
                    <th>Termines</th>
                    <th>Echecs</th>
                    <th>Score moyen</th>
                    <th>Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((row) => (
                    <tr key={row.course_id} className="border-b border-gold/5">
                      <td className="py-3 font-medium text-cream">{row.title}</td>
                      <td>{row.course_type}</td>
                      <td>{row.level}</td>
                      <td>{row.enrolled_users}</td>
                      <td>{row.completed_users}</td>
                      <td>{row.failed_users}</td>
                      <td>{formatPercent(row.average_score)}</td>
                      <td>{formatPercent(row.completion_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
