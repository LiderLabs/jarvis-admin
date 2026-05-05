'use client';

import { useState, useCallback } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from '@liderlabs/washlab-backend/api';
import { Id } from "@liderlabs/washlab-backend/dataModel";
import { toast } from "sonner";
import {
  Package, Plus, Edit, Trash2, AlertTriangle, CheckCircle,
  Search, Droplets, Info,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type InventoryCategory = "washing_supplies" | "equipment_parts" | "packaging" | "operational";
type InventoryStatus = "critical" | "low" | "ok" | "ordered";

interface InventoryItem {
  _id: Id<"inventoryItems">;
  name: string;
  category: InventoryCategory;
  unit: string;
  description?: string;
  currentStock: number;
  maxStock: number;
  minStock: number;
  reorderPoint: number;
  scoopsPerUnit?: number;
  usageNotes?: string;
  status: InventoryStatus;
  orderedAt?: number;
  expectedArrivalDate?: number;
  orderQuantity?: number;
  branchId: Id<"branches">;
  createdAt: number;
  updatedAt: number;
  lastRestockedAt?: number;
}


const categoryDescriptions: Record<InventoryCategory, string> = {
  washing_supplies: "Detergents, softeners, bleach, starch",
  equipment_parts: "Machine parts, belts, filters, maintenance tools",
  packaging: "Bags, hangers, tags, wrapping",
  operational: "Gloves, aprons, cleaning cloths, consumables",
};
const categoryLabels: Record<InventoryCategory, string> = {
  washing_supplies: "Washing Supplies",
  equipment_parts: "Equipment & Parts",
  packaging: "Packaging",
  operational: "Operational",
};

function NumInput({ value, onChange, placeholder, min = "0" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; min?: string;
}) {
  return (
    <Input
      type="number"
      min={min}
      value={value}
      placeholder={placeholder ?? "0"}
      onChange={e => onChange(e.target.value)}
      onBlur={e => { if (e.target.value === "" || e.target.value === "-") onChange("0"); }}
    />
  );
}

const emptyForm = () => ({
  name: "", category: "washing_supplies" as InventoryCategory,
  unit: "", description: "",
  newStock: "",
  minStock: "", reorderPoint: "",
  scoopsPerUnit: "", usageNotes: "",
  branchId: null as Id<"branches"> | null,
});


const UNIT_OPTIONS = ["Bags", "Boxes", "Rolls", "Bottles", "Litres", "Kg", "Pieces", "Cartons", "Others"];
const AdminInventory = () => {
  const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | "all">("all");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Id<"inventoryItems"> | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState(emptyForm());
  const [customUnit, setCustomUnit] = useState("");

  const branches = useQuery(api.admin.getBranches, {
    includeInactive: false,
    paginationOpts: { cursor: null, numItems: 100 },
  });
  const branchesList = branches?.page || [];

  const createItem = useMutation(api.inventory.create);
  const updateItem = useMutation(api.inventory.update);
  const deleteItem = useMutation(api.inventory.deleteItem);

  const inventory = useQuery(
    api.inventory.getByBranch,
    selectedBranch !== "all" ? { branchId: selectedBranch as Id<"branches"> } : {}
  ) as InventoryItem[] | undefined;

  const isLoading = inventory === undefined;

  const filteredInventory = (inventory || []).filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    return true;
  });

  const stats = {
    total: filteredInventory.length,
    critical: filteredInventory.filter(i => i.status === "critical").length,
    low: filteredInventory.filter(i => i.status === "low").length,
    ordered: filteredInventory.filter(i => i.status === "ordered").length,
    ok: filteredInventory.filter(i => i.status === "ok").length,
  };

  const n = (v: string) => parseFloat(v) || 0;

  const handleOpenItemDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name, category: item.category, unit: item.unit,
        description: item.description || "",
        newStock: "",
        minStock: String(item.minStock),
        reorderPoint: String(item.reorderPoint),
        scoopsPerUnit: item.scoopsPerUnit ? String(item.scoopsPerUnit) : "",
        usageNotes: item.usageNotes || "",
        branchId: item.branchId,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        ...emptyForm(),
        branchId: selectedBranch !== "all" ? (selectedBranch as Id<"branches">) : null,
      });
    }
    setShowItemDialog(true);
  };

  const handleSaveItem = async () => {
    const branchId: Id<"branches"> | null = selectedBranch !== "all" ? selectedBranch as Id<"branches"> : itemForm.branchId;
    if (!itemForm.name.trim()) return toast.error("Please enter item name");
    if (!itemForm.unit.trim()) return toast.error("Please enter unit");
    const minStock = n(itemForm.minStock);
    const reorderPoint = n(itemForm.reorderPoint);
    if (minStock < 0) return toast.error("Min stock cannot be negative");
    if (reorderPoint < 0) return toast.error("Reorder point cannot be negative");
    if (minStock >= reorderPoint) return toast.error("Min stock must be less than reorder point");

    try {
      if (editingItem) {
        const newStockVal = itemForm.newStock !== "" ? n(itemForm.newStock) : undefined;
        await (updateItem as any)({
          itemId: editingItem._id,
          name: itemForm.name, category: itemForm.category, unit: itemForm.unit,
          description: itemForm.description, minStock, reorderPoint,
          ...(newStockVal !== undefined ? { currentStock: newStockVal, maxStock: newStockVal } : {}),
          scoopsPerUnit: itemForm.scoopsPerUnit ? n(itemForm.scoopsPerUnit) : undefined,
          usageNotes: itemForm.usageNotes || undefined,
        });
      } else {
        if (!branchId) return toast.error("Please select a branch");
        const stockVal = n(itemForm.newStock);
        await (createItem as any)({
          branchId, name: itemForm.name, category: itemForm.category,
          unit: itemForm.unit, description: itemForm.description,
          currentStock: stockVal, maxStock: stockVal, minStock, reorderPoint,
          scoopsPerUnit: itemForm.scoopsPerUnit ? n(itemForm.scoopsPerUnit) : undefined,
          usageNotes: itemForm.usageNotes || undefined,
        });
      }
      setShowItemDialog(false);
      setEditingItem(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save item");
    }
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete) return;
    try {
      await deleteItem({ itemId: itemToDelete });
      setShowDeleteDialog(false);
      setItemToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete item");
    }
  }, [itemToDelete, deleteItem]);

  const getStatusConfig = (status: InventoryStatus) => ({
    critical: { label: "Critical", cls: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
    low: { label: "Low Stock", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
    ok: { label: "In Stock", cls: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
    ordered: { label: "Ordered", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: Package },
  }[status]);

  const f = (k: keyof typeof itemForm) => (v: string) => setItemForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure stock, thresholds and usage rates per branch</p>
        </div>
        <Button onClick={() => handleOpenItemDialog()} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Items", value: stats.total, cls: "text-foreground" },
          { label: "Critical", value: stats.critical, cls: "text-red-600" },
          { label: "Low Stock", value: stats.low, cls: "text-amber-600" },
          { label: "Ordered", value: stats.ordered, cls: "text-blue-600" },
          { label: "In Stock", value: stats.ok, cls: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select value={selectedBranch} onValueChange={(v) => setSelectedBranch(v as any)}>
            <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branchesList.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="ok">In Stock</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(categoryLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No inventory items found</p>
          <Button onClick={() => handleOpenItemDialog()} className="mt-4" variant="outline">
            <Plus className="w-4 h-4 mr-2" /> Add First Item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => {
            const cfg = getStatusConfig(item.status);
            const StatusIcon = cfg.icon;
            const stockPct = Math.min((item.currentStock / item.maxStock) * 100, 100);
            const branch = branchesList.find(b => b._id === item.branchId);
            const totalScoops = item.scoopsPerUnit && item.currentStock > 0
              ? Math.floor(item.currentStock * item.scoopsPerUnit) : null;

            return (
              <div key={item._id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">{categoryLabels[item.category]}</span>
                      {selectedBranch === "all" && branch && (
                        <Badge variant="outline" className="text-xs">{branch.name}</Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`${cfg.cls} flex items-center gap-1 flex-shrink-0 text-xs`}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </Badge>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stock</span>
                    <span className="font-medium">{item.currentStock} {item.unit}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all ${stockPct < 20 ? 'bg-red-500' : stockPct < 40 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${stockPct}%` }}
                    />
                  </div>
                  {item.currentStock <= item.minStock && (
                    <div className="flex justify-end text-xs mt-1">
                      <span className="text-red-500">?? Below alert threshold ({item.minStock} {item.unit})</span>
                    </div>
                  )}
                </div>

                {item.scoopsPerUnit && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mb-3">
                    <Droplets className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <div className="text-xs">
                      <span className="text-muted-foreground">{item.scoopsPerUnit} scoops/{item.unit}</span>
                      {totalScoops !== null && (
                        <span className="text-foreground font-medium ml-2">� {totalScoops} scoops remaining</span>
                      )}
                    </div>
                  </div>
                )}

                {item.usageNotes && (
                  <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg mb-3">
                    <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{item.usageNotes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => handleOpenItemDialog(item)}>
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setItemToDelete(item._id); setShowDeleteDialog(true); }}
                    className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update item details. Enter a new stock number to restock."
                : "Add a new item and configure thresholds for this branch."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {!editingItem && (
                <div className="col-span-2">
                  <Label>Branch *</Label>
                  <Select value={itemForm.branchId || ""} onValueChange={(v) => setItemForm({ ...itemForm, branchId: v as Id<"branches"> })}>
                    <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                    <SelectContent>
                      {branchesList.map(b => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2">
                <Label>Item Name *</Label>
                <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g., Liquid Detergent" />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v as InventoryCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit *</Label>
                <Select value={UNIT_OPTIONS.includes(itemForm.unit) ? itemForm.unit : (itemForm.unit ? "Others" : "")} onValueChange={(v) => {
                  if (v === "Others") { setItemForm({ ...itemForm, unit: customUnit }); }
                  else { setCustomUnit(""); setItemForm({ ...itemForm, unit: v }); }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(!UNIT_OPTIONS.includes(itemForm.unit) || itemForm.unit === "") && (itemForm.unit !== "" || customUnit !== "") || (!UNIT_OPTIONS.slice(0,-1).includes(itemForm.unit)) ? (
                  <Input className="mt-2" value={itemForm.unit && !UNIT_OPTIONS.slice(0,-1).includes(itemForm.unit) ? itemForm.unit : customUnit}
                    placeholder="Enter custom unit"
                    onChange={(e) => { setCustomUnit(e.target.value); setItemForm({ ...itemForm, unit: e.target.value }); }} />
                ) : null}
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Optional description" rows={2} />
              </div>

              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stock</p>
              </div>
              <div className="col-span-2">
                <Label>{editingItem ? "New Stock Amount" : "Starting Stock"}</Label>
                <NumInput
                  value={itemForm.newStock}
                  onChange={f("newStock")}
                  placeholder={editingItem ? "Enter updated stock number" : "Enter starting stock"}
                />
                {editingItem && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current stock: <span className="font-medium">{editingItem.currentStock} {editingItem.unit}</span>. Leave blank to keep unchanged.
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Thresholds</p>
              </div>
              <div>
                <Label>Min Stock (Critical threshold) *</Label>
                <NumInput value={itemForm.minStock} onChange={f("minStock")} />
              </div>
              <div>
                <Label>Reorder Point *</Label>
                <NumInput value={itemForm.reorderPoint} onChange={f("reorderPoint")} />
              </div>

              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Usage Rate (Optional)</p>
              </div>
              <div>
                <Label>Scoops / Uses per {itemForm.unit || "Unit"}</Label>
                <NumInput value={itemForm.scoopsPerUnit} onChange={f("scoopsPerUnit")} placeholder="e.g., 20" />
                <p className="text-xs text-muted-foreground mt-1">How many scoops or uses before one {itemForm.unit || "unit"} is finished</p>
              </div>
              <div>
                <Label>Usage Notes</Label>
                <Input value={itemForm.usageNotes} onChange={(e) => setItemForm({ ...itemForm, usageNotes: e.target.value })} placeholder="e.g., 2 scoops per wash cycle" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowItemDialog(false); setEditingItem(null); }}>Cancel</Button>
            <Button onClick={handleSaveItem}>{editingItem ? "Update" : "Create"} Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminInventory;
