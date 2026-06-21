import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Edit, 
  Trash2, 
  Folder,
  FolderOpen,
  Eye,
  EyeOff,
  AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminCategory } from "@/hooks/useAdmin";

interface CategoriesTableProps {
  categories: AdminCategory[];
  isLoading: boolean;
  onAddCategory: () => void;
  onEditCategory: (category: AdminCategory) => void;
  onDeleteCategory: (category: AdminCategory) => void;
  onRefresh: () => void;
}

export function CategoriesTable({ 
  categories, 
  isLoading, 
  onAddCategory,
  onEditCategory,
  onDeleteCategory, 
  onRefresh 
}: CategoriesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<AdminCategory | null>(null);

  const filteredCategories = categories.filter((category) => {
    const matchesSearch = 
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && category.is_active) ||
      (statusFilter === "inactive" && !category.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleDeleteConfirm = () => {
    if (deleteConfirmCategory) {
      onDeleteCategory(deleteConfirmCategory);
      setDeleteConfirmCategory(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full bg-cream/10" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
          <Input
            placeholder="Rechercher une catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-cream/5 border-gold/20 text-cream">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="bg-noir border-gold/20">
            <SelectItem value="all" className="text-cream">Tous</SelectItem>
            <SelectItem value="active" className="text-cream">Actives</SelectItem>
            <SelectItem value="inactive" className="text-cream">Inactives</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="border-gold/20 text-cream hover:bg-cream/10"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          onClick={onAddCategory}
          className="bg-gradient-gold text-noir font-semibold hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Table */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-cream/30 mx-auto mb-4" />
          <p className="text-cream/60">Aucune catégorie trouvée</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gold/20 hover:bg-transparent">
                <TableHead className="text-cream/60">Catégorie</TableHead>
                <TableHead className="text-cream/60">Slug</TableHead>
                <TableHead className="text-cream/60">Description</TableHead>
                <TableHead className="text-cream/60 text-center">Ordre</TableHead>
                <TableHead className="text-cream/60 text-center">Seuil stock</TableHead>
                <TableHead className="text-cream/60 text-center">Statut</TableHead>
                <TableHead className="text-cream/60 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories
                .sort((a, b) => {
                  // Parents first, then children grouped under parent
                  if (!a.parent_id && !b.parent_id) return (a.display_order || 0) - (b.display_order || 0);
                  if (!a.parent_id && b.parent_id) return b.parent_id === a.id ? -1 : (a.display_order || 0) - (b.display_order || 0);
                  if (a.parent_id && !b.parent_id) return a.parent_id === b.id ? 1 : (a.display_order || 0) - (b.display_order || 0);
                  if (a.parent_id === b.parent_id) return (a.display_order || 0) - (b.display_order || 0);
                  return 0;
                })
                .map((category, index) => {
                  const isChild = !!category.parent_id;
                  const parentName = isChild ? categories.find(c => c.id === category.parent_id)?.name : null;
                  return (
                <motion.tr
                  key={category.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-gold/10 hover:bg-cream/5 cursor-pointer group"
                >
                  <TableCell>
                    <div className={`flex items-center gap-3 ${isChild ? 'pl-6' : ''}`}>
                      {isChild && <span className="text-cream/20 text-xs">└</span>}
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-cream/10 flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-cream/40" />
                        </div>
                      )}
                      <div>
                        <span className="text-cream font-medium">{category.name}</span>
                        {parentName && (
                          <p className="text-cream/40 text-xs">{parentName}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-cream/50 text-sm font-mono">{category.slug}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-cream/60 text-sm line-clamp-1 max-w-xs">
                      {category.description || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-cream/70">{category.display_order || 0}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {category.low_stock_threshold ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30 border">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {category.low_stock_threshold} unités
                      </Badge>
                    ) : (
                      <span className="text-cream/40 text-sm">Par défaut</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${
                      category.is_active 
                        ? "bg-green-500/20 text-green-500 border-green-500/30" 
                        : "bg-red-500/20 text-red-500 border-red-500/30"
                    } border`}>
                      {category.is_active ? (
                        <><Eye className="h-3 w-3 mr-1" /> Visible</>
                      ) : (
                        <><EyeOff className="h-3 w-3 mr-1" /> Masquée</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditCategory(category);
                        }}
                        className="h-8 w-8 text-cream/60 hover:text-cream hover:bg-cream/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmCategory(category);
                        }}
                        className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-cream/40 text-sm text-right">
        {filteredCategories.length} catégorie{filteredCategories.length > 1 ? "s" : ""}
      </p>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmCategory} onOpenChange={() => setDeleteConfirmCategory(null)}>
        <AlertDialogContent className="bg-noir border-gold/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-cream">Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription className="text-cream/60">
              Êtes-vous sûr de vouloir supprimer la catégorie "{deleteConfirmCategory?.name}" ? 
              Les produits associés seront conservés mais n'auront plus de catégorie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gold/30 text-cream hover:bg-cream/10">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
