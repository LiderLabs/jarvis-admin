'use client';

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "convex/react";
import { api } from "@devlider001/washlab-backend/api";
import { Id } from "@devlider001/washlab-backend/dataModel";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  X,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type InventoryCategory =
  | "cleaning_supplies"
  | "add_ons"
  | "facility"
  | "retail"
  | "operational";

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
  status: InventoryStatus;
  orderedAt?: number;
  expectedArrivalDate?: number;
  arrivalDate?: number;
  orderQuantity?: number;
  branchId: Id<"branches">;
  createdAt: number;
  updatedAt: number;
  lastRestockedAt?: number;
}

const AdminInventory = () => {
  const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | "all">("all");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Id<"inventoryItems"> | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [stockUpdateValue, setStockUpdateValue] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [orderArrivalDate, setOrderArrivalDate] = useState("");
  const [receiveQuantity, setReceiveQuantity] = useState("");
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "cleaning_supplies" as InventoryCategory,
    unit: "",
    description: "",
    currentStock: 0,
    maxStock: 0,
    minStock: 0,
    reorderPoint: 0,
    branchId: null as Id<"branches"> | null,
  });

  // Fetch data
  const branches = useQuery(api.admin.getBranches, {
    includeInactive: false,
    paginationOpts: { cursor: null, numItems: 100 },
  });
  const createItem = useMutation(api.inventory.create);
  const updateItem = useMutation(api.inventory.update);
  const updateStock = useMutation(api.inventory.updateStock);
  const deleteItem = useMutation(api.inventory.deleteItem);
  const placeOrder = useMutation(api.inventory.placeOrder);
  const receiveOrder = useMutation(api.inventory.receiveOrder);

  // Get inventory for selected branch or all branches
  const inventory = useQuery(
    api.inventory.getByBranch,
    selectedBranch !== "all" && selectedBranch
      ? { branchId: selectedBranch as Id<"branches"> }
      : selectedBranch === "all"
      ? {}
      : "skip"
  ) as InventoryItem[] | undefined;

  const isLoading = inventory === undefined;

  // Display inventory
  const displayInventory = inventory || [];

  // Filter inventory
  const filteredInventory = displayInventory.filter((item) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !item.name.toLowerCase().includes(query) &&
        !item.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== "all" && item.status !== statusFilter) {
      return false;
    }
    if (categoryFilter !== "all" && item.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  // Calculate stats
  const stats = {
    total: filteredInventory.length,
    critical: filteredInventory.filter((i) => i.status === "critical").length,
    low: filteredInventory.filter((i) => i.status === "low").length,
    ordered: filteredInventory.filter((i) => i.status === "ordered").length,
    ok: filteredInventory.filter((i) => i.status === "ok").length,
  };

  const handleOpenItemDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        category: item.category,
        unit: item.unit,
        description: item.description || "",
        currentStock: item.currentStock,
        maxStock: item.maxStock,
        minStock: item.minStock,
        reorderPoint: item.reorderPoint,
        branchId: item.branchId,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: "",
        category: "cleaning_supplies",
        unit: "",
        description: "",
        currentStock: 0,
        maxStock: 0,
        minStock: 0,
        reorderPoint: 0,
        branchId: selectedBranch !== "all" ? (selectedBranch as Id<"branches">) : null,
      });
    }
    setShowItemDialog(true);
  };

  const handleCloseItemDialog = () => {
    setShowItemDialog(false);
    setEditingItem(null);
    setItemForm({
      name: "",
      category: "cleaning_supplies",
      unit: "",
      description: "",
      currentStock: 0,
      maxStock: 0,
      minStock: 0,
      reorderPoint: 0,
      branchId: null,
    });
  };

  const handleSaveItem = async () => {
    // Determine which branch to use
    let branchId: Id<"branches"> | null = null;
    if (selectedBranch !== "all" && selectedBranch) {
      branchId = selectedBranch as Id<"branches">;
    } else if (itemForm.branchId) {
      branchId = itemForm.branchId;
    }

    if (!itemForm.name.trim()) {
      toast.error("Please enter item name");
      return;
    }
    if (!itemForm.unit.trim()) {
      toast.error("Please enter unit");
      return;
    }
    if (itemForm.maxStock <= 0) {
      toast.error("Max stock must be greater than 0");
      return;
    }
    if (itemForm.minStock < 0) {
      toast.error("Min stock cannot be negative");
      return;
    }
    if (itemForm.reorderPoint < 0) {
      toast.error("Reorder point cannot be negative");
      return;
    }
    if (itemForm.minStock >= itemForm.reorderPoint) {
      toast.error("Min stock must be less than reorder point");
      return;
    }
    if (itemForm.reorderPoint >= itemForm.maxStock) {
      toast.error("Reorder point must be less than max stock");
      return;
    }

    try {
      if (editingItem) {
        await updateItem({
          itemId: editingItem._id,
          name: itemForm.name,
          category: itemForm.category,
          unit: itemForm.unit,
          description: itemForm.description,
          maxStock: itemForm.maxStock,
          minStock: itemForm.minStock,
          reorderPoint: itemForm.reorderPoint,
        });
        toast.success("Inventory item updated successfully");
      } else {
        if (!branchId) {
          toast.error("Please select a branch");
          return;
        }
        await createItem({
          branchId,
          name: itemForm.name,
          category: itemForm.category,
          unit: itemForm.unit,
          description: itemForm.description,
          currentStock: itemForm.currentStock,
          maxStock: itemForm.maxStock,
          minStock: itemForm.minStock,
          reorderPoint: itemForm.reorderPoint,
        });
        toast.success("Inventory item created successfully");
      }
      handleCloseItemDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to save item");
    }
  };

  const handleDeleteClick = (itemId: Id<"inventoryItems">) => {
    setItemToDelete(itemId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      await deleteItem({ itemId: itemToDelete });
      toast.success("Inventory item deleted successfully");
      setShowDeleteDialog(false);
      setItemToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete item");
    }
  }, [itemToDelete, deleteItem]);

  const handleOpenStockDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setStockUpdateValue(item.currentStock.toString());
    setShowStockDialog(true);
  };

  const handleOpenOrderDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setOrderQuantity("");
    setOrderArrivalDate("");
    setShowOrderDialog(true);
  };

  const handleOpenReceiveDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setReceiveQuantity(item.orderQuantity?.toString() || "");
    setShowReceiveDialog(true);
  };

  const handleUpdateStock = async () => {
    if (!editingItem) return;

    const newStock = parseFloat(stockUpdateValue);
    if (isNaN(newStock) || newStock < 0) {
      toast.error("Please enter a valid stock amount");
      return;
    }

    try {
      await updateStock({ itemId: editingItem._id, currentStock: newStock });
      toast.success("Stock updated successfully");
      setShowStockDialog(false);
      setEditingItem(null);
      setStockUpdateValue("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update stock");
    }
  };

  const handlePlaceOrder = async () => {
    if (!editingItem) return;

    const quantity = parseFloat(orderQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid order quantity");
      return;
    }

    let arrivalTimestamp: number | undefined;
    if (orderArrivalDate) {
      const date = new Date(orderArrivalDate);
      if (isNaN(date.getTime())) {
        toast.error("Please enter a valid date");
        return;
      }
      arrivalTimestamp = date.getTime();
    }

    try {
      await placeOrder({
        itemId: editingItem._id,
        orderQuantity: quantity,
        expectedArrivalDate: arrivalTimestamp,
      });
      toast.success("Order placed successfully");
      setShowOrderDialog(false);
      setEditingItem(null);
      setOrderQuantity("");
      setOrderArrivalDate("");
    } catch (error: any) {
      toast.error(error.message || "Failed to place order");
    }
  };

  const handleReceiveOrder = async () => {
    if (!editingItem) return;

    let receivedQty: number | undefined;
    if (receiveQuantity) {
      receivedQty = parseFloat(receiveQuantity);
      if (isNaN(receivedQty) || receivedQty <= 0) {
        toast.error("Please enter a valid quantity");
        return;
      }
    }

    try {
      await receiveOrder({
        itemId: editingItem._id,
        receivedQuantity: receivedQty,
      });
      toast.success("Order received and stock updated");
      setShowReceiveDialog(false);
      setEditingItem(null);
      setReceiveQuantity("");
    } catch (error: any) {
      toast.error(error.message || "Failed to receive order");
    }
  };

  const getStatusBadge = (status: InventoryStatus) => {
    const config: Record<
      InventoryStatus,
      { label: string; className: string; icon: any }
    > = {
      critical: {
        label: "Critical",
        className: "bg-destructive/10 text-destructive border-destructive/20",
        icon: AlertTriangle,
      },
      low: {
        label: "Low Stock",
        className: "bg-warning/10 text-warning border-warning/20",
        icon: AlertTriangle,
      },
      ok: {
        label: "In Stock",
        className: "bg-success/10 text-success border-success/20",
        icon: CheckCircle,
      },
      ordered: {
        label: "Ordered",
        className: "bg-primary/10 text-primary border-primary/20",
        icon: Package,
      },
    };
    return config[status];
  };

  const categoryLabels: Record<InventoryCategory, string> = {
    cleaning_supplies: "Cleaning Supplies",
    add_ons: "Add-ons",
    facility: "Facility",
    retail: "Retail",
    operational: "Operational",
  };

  const branchesList = branches?.page || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Inventory Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage inventory items across all branches
          </p>
        </div>
        <Button
          onClick={() => handleOpenItemDialog()}
          className="gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add Inventory Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{stats.low}</div>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{stats.ordered}</div>
            <p className="text-xs text-muted-foreground">Ordered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{stats.ok}</div>
            <p className="text-xs text-muted-foreground">In Stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Branch</Label>
              <Select
                value={selectedBranch}
                onValueChange={(value) =>
                  setSelectedBranch(value as Id<"branches"> | "all")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branchesList.map((branch) => (
                    <SelectItem key={branch._id} value={branch._id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as InventoryStatus | "all")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="ok">In Stock</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) =>
                  setCategoryFilter(value as InventoryCategory | "all")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Items */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : filteredInventory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No inventory items found</p>
            {selectedBranch !== "all" && (
              <Button
                onClick={() => handleOpenItemDialog()}
                className="mt-4"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => {
            const statusBadge = getStatusBadge(item.status);
            const StatusIcon = statusBadge.icon;
            const stockPercentage = (item.currentStock / item.maxStock) * 100;
            const branch = branchesList.find((b) => b._id === item.branchId);

            return (
              <Card key={item._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{item.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[item.category]}
                        </Badge>
                        {selectedBranch === "all" && branch && (
                          <Badge variant="outline" className="text-xs">
                            {branch.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${statusBadge.className} flex items-center gap-1`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stock Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stock</span>
                      <span className="font-medium">
                        {item.currentStock} / {item.maxStock} {item.unit}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          stockPercentage < 20
                            ? "bg-destructive"
                            : stockPercentage < 40
                            ? "bg-warning"
                            : "bg-success"
                        }`}
                        style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Min: {item.minStock}</span>
                      <span>Reorder: {item.reorderPoint}</span>
                    </div>
                  </div>

                  {/* Order Info */}
                  {item.status === "ordered" && item.expectedArrivalDate && (
                    <div className="text-xs text-primary bg-primary/10 p-2 rounded">
                      Arriving:{" "}
                      {new Date(item.expectedArrivalDate).toLocaleDateString()}
                      {item.orderQuantity && ` (Qty: ${item.orderQuantity})`}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenItemDialog(item)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDeleteClick(item._id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Create Inventory Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update inventory item details"
                : "Add a new inventory item to the selected branch"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {!editingItem && (
                <div className="col-span-2">
                  <Label htmlFor="branch">Branch *</Label>
                  <Select
                    value={itemForm.branchId || ""}
                    onValueChange={(value) =>
                      setItemForm({ ...itemForm, branchId: value as Id<"branches"> })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchesList.map((branch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  placeholder="e.g., Liquid Detergent"
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={itemForm.category}
                  onValueChange={(value) =>
                    setItemForm({ ...itemForm, category: value as InventoryCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  value={itemForm.unit}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, unit: e.target.value })
                  }
                  placeholder="e.g., Units, Boxes, Rolls"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description: e.target.value })
                  }
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  min="0"
                  value={itemForm.currentStock}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      currentStock: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="maxStock">Max Stock *</Label>
                <Input
                  id="maxStock"
                  type="number"
                  min="1"
                  value={itemForm.maxStock}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      maxStock: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="minStock">Min Stock (Critical Threshold) *</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={itemForm.minStock}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      minStock: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="reorderPoint">Reorder Point *</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  min="0"
                  value={itemForm.reorderPoint}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      reorderPoint: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseItemDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              {editingItem ? "Update" : "Create"} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Stock Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock - {editingItem?.name}</DialogTitle>
            <DialogDescription>
              Update the current stock level for this item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="stock">Current Stock ({editingItem?.unit})</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stockUpdateValue}
                onChange={(e) => setStockUpdateValue(e.target.value)}
                placeholder="Enter stock amount"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current: {editingItem?.currentStock} / Max: {editingItem?.maxStock}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStock}>Update Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Place Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Order - {editingItem?.name}</DialogTitle>
            <DialogDescription>
              Place an order for restocking this item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="orderQuantity">Order Quantity ({editingItem?.unit})</Label>
              <Input
                id="orderQuantity"
                type="number"
                min="1"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                placeholder="Enter quantity to order"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="arrivalDate">Expected Arrival Date (Optional)</Label>
              <Input
                id="arrivalDate"
                type="date"
                value={orderArrivalDate}
                onChange={(e) => setOrderArrivalDate(e.target.value)}
                className="mt-1"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlaceOrder}>Place Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Order Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Order - {editingItem?.name}</DialogTitle>
            <DialogDescription>
              Mark the order as received and update stock
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="receiveQuantity">
                Received Quantity ({editingItem?.unit})
              </Label>
              <Input
                id="receiveQuantity"
                type="number"
                min="1"
                value={receiveQuantity}
                onChange={(e) => setReceiveQuantity(e.target.value)}
                placeholder={
                  editingItem?.orderQuantity
                    ? `Default: ${editingItem.orderQuantity}`
                    : "Enter received quantity"
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editingItem?.orderQuantity &&
                  `Ordered: ${editingItem.orderQuantity} ${editingItem.unit}`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceiveOrder}>Receive Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminInventory;
