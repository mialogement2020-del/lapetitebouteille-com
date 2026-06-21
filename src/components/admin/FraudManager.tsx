import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFraudDetection, type ReviewStatus } from "@/hooks/useFraudDetection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldAlert, ShieldCheck, ShieldX, Ban, Trash2 } from "lucide-react";

const levelColor: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function FraudManager() {
  const { t } = useTranslation();
  const {
    scores,
    scoresLoading,
    rules,
    blocked,
    review,
    updateRule,
    block,
    unblock,
  } = useFraudDetection();

  const [newBlock, setNewBlock] = useState<{
    entity_type: "email" | "phone" | "ip";
    entity_value: string;
    reason: string;
  }>({ entity_type: "email", entity_value: "", reason: "" });

  const counts = scores.reduce(
    (acc, s) => {
      acc[s.risk_level] = (acc[s.risk_level] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["low", "medium", "high", "critical"] as const).map((l) => (
          <Card key={l} className="bg-noir-light/40 border-gold/20">
            <CardContent className="p-4">
              <div className="text-xs text-cream/60 uppercase">{t(`adminFraudExtra.risk.${l}`)}</div>
              <div className="text-2xl font-bold text-cream">{counts[l] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="scores">
        <TabsList>
          <TabsTrigger value="scores">{t("adminFraudExtra.tabs.scores")}</TabsTrigger>
          <TabsTrigger value="rules">{t("adminFraudExtra.tabs.rules")}</TabsTrigger>
          <TabsTrigger value="blocked">{t("adminFraudExtra.tabs.blocked")}</TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          <Card className="bg-noir-light/40 border-gold/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <ShieldAlert className="h-5 w-5" /> {t("adminFraud.riskOrders")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scoresLoading ? (
                <div className="text-cream/60">{t("adminFraudExtra.loading")}</div>
              ) : scores.length === 0 ? (
                <div className="text-cream/60">{t("adminFraudExtra.noScores")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("adminFraudExtra.table.order")}</TableHead>
                        <TableHead>{t("adminFraudExtra.table.client")}</TableHead>
                        <TableHead>{t("adminFraudExtra.table.total")}</TableHead>
                        <TableHead>{t("adminFraudExtra.table.score")}</TableHead>
                        <TableHead>{t("adminFraudExtra.table.factors")}</TableHead>
                        <TableHead>{t("adminFraudExtra.table.status")}</TableHead>
                        <TableHead>{t("adminFraudExtra.table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scores.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">
                            {s.order?.order_number ?? s.order_id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.order?.shipping_full_name ||
                              s.order?.guest_email ||
                              s.order?.guest_phone ||
                              "—"}
                          </TableCell>
                          <TableCell>{s.order?.total?.toLocaleString()} FCFA</TableCell>
                          <TableCell>
                            <Badge className={levelColor[s.risk_level]}>
                              {s.score} · {s.risk_level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-cream/70">
                            {s.factors.map((f) => f.rule).join(", ") || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{s.review_status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  review({ id: s.id, status: "approved" as ReviewStatus })
                                }
                              >
                                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  review({ id: s.id, status: "rejected" as ReviewStatus })
                                }
                              >
                                <ShieldX className="h-4 w-4 text-red-400" />
                              </Button>
                              {s.order?.guest_email && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={t("adminFraudExtra.blockEmail")}
                                  onClick={() =>
                                    block({
                                      entity_type: "email",
                                      entity_value: s.order!.guest_email!,
                                      reason: `Risk ${s.score}`,
                                    })
                                  }
                                >
                                  <Ban className="h-4 w-4 text-orange-400" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card className="bg-noir-light/40 border-gold/20">
            <CardHeader>
              <CardTitle className="text-cream">{t("adminFraud.antiFraudRules")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col md:flex-row md:items-end gap-3 p-3 rounded border border-gold/10"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-cream">{r.label}</div>
                    <div className="text-xs text-cream/60">{r.description}</div>
                  </div>
                  <div>
                    <Label className="text-xs">{t("adminFraud.threshold")}</Label>
                    <Input
                      type="number"
                      defaultValue={r.threshold}
                      className="w-32"
                      onBlur={(e) =>
                        updateRule({ id: r.id, threshold: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("adminFraud.weight")}</Label>
                    <Input
                      type="number"
                      defaultValue={r.weight}
                      className="w-24"
                      onBlur={(e) =>
                        updateRule({ id: r.id, weight: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) => updateRule({ id: r.id, is_active: v })}
                    />
                    <span className="text-xs text-cream/60">{t("adminFraud.active")}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <Card className="bg-noir-light/40 border-gold/20">
            <CardHeader>
              <CardTitle className="text-cream">{t("adminFraud.blockedEntities")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                <div>
                  <Label className="text-xs">{t("adminFraudExtra.blockType")}</Label>
                  <Select
                    value={newBlock.entity_type}
                    onValueChange={(v: any) =>
                      setNewBlock({ ...newBlock, entity_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">{t("adminFraudExtra.entityType.email")}</SelectItem>
                      <SelectItem value="phone">{t("adminFraudExtra.entityType.phone")}</SelectItem>
                      <SelectItem value="ip">{t("adminFraudExtra.entityType.ip")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("adminFraudExtra.blockValue")}</Label>
                  <Input
                    value={newBlock.entity_value}
                    onChange={(e) =>
                      setNewBlock({ ...newBlock, entity_value: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("adminFraudExtra.blockReason")}</Label>
                  <Input
                    value={newBlock.reason}
                    onChange={(e) =>
                      setNewBlock({ ...newBlock, reason: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!newBlock.entity_value.trim()) return;
                    block(newBlock);
                    setNewBlock({ entity_type: "email", entity_value: "", reason: "" });
                  }}
                >
                  {t("adminFraudExtra.block")}
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("adminFraudExtra.blockType")}</TableHead>
                    <TableHead>{t("adminFraudExtra.blockValue")}</TableHead>
                    <TableHead>{t("adminFraudExtra.blockReason")}</TableHead>
                    <TableHead>{t("adminFraudExtra.since")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocked.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Badge variant="outline">{b.entity_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{b.entity_value}</TableCell>
                      <TableCell className="text-sm">{b.reason ?? "—"}</TableCell>
                      <TableCell className="text-xs text-cream/60">
                        {new Date(b.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => unblock(b.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}