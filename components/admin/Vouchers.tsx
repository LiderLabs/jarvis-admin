'use client';
import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Ticket, Plus, Copy, Trash2, Loader2, X, Building2, Globe } from 'lucide-react';

type DiscountType = 'percentage' | 'fixed' | 'free_wash';

const Vouchers = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    discountType: 'percentage' as DiscountType,
    discountValue: '' as any,
    usageLimit: '' as any,
    description: '',
    branchScope: 'all' as 'all' | 'specific',
    selectedBranchId: '' as string,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const vouchersData = useQuery((api as any).vouchers.getAll, { includeInactive: true });
  const vouchers = vouchersData?.page ?? [];

  const branchesRaw = useQuery((api as any).admin.getBranches, {});
  const branches: any[] = (branchesRaw?.page ?? branchesRaw ?? []).filter((b: any) => b.isActive && !b.isDeleted);

  const createVoucher = useMutation((api as any).vouchers.create);
  const updateVoucher = useMutation((api as any).vouchers.update);

  const getBranchName = (branchId: string) => {
    const b = branches.find((b: any) => b._id === branchId);
    return b ? b.name : branchId;
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const toggleVoucher = async (voucherId: string, isActive: boolean) => {
    try {
      await updateVoucher({ voucherId: voucherId as any, isActive: !isActive });
      toast.success(`Voucher ${!isActive ? 'enabled' : 'disabled'}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update voucher');
    }
  };

  const handleDelete = async (voucherId: string) => {
    if (!confirm("Delete this voucher? This cannot be undone.")) return;
    setDeletingId(voucherId);
    try {
      await updateVoucher({ voucherId: voucherId as any, isDeleted: true });
      toast.success("Voucher deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete voucher");
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (voucher: any) => {
    const hasBranches = voucher.applicableBranches && voucher.applicableBranches.length > 0;
    setEditingVoucher(voucher);
    setEditForm({
      code: voucher.code,
      name: voucher.name || "",
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      usageLimit: voucher.usageLimit,
      description: voucher.description || "",
      branchScope: hasBranches ? 'specific' : 'all',
      selectedBranchId: hasBranches ? voucher.applicableBranches[0] : '',
    });
  };

  const handleEdit = async () => {
    if (!editingVoucher || !editForm) return;
    setIsEditSubmitting(true);
    try {
      const applicableBranches = editForm.branchScope === 'specific' && editForm.selectedBranchId
        ? [editForm.selectedBranchId]
        : [];
      await updateVoucher({
        voucherId: editingVoucher._id as any,
        name: editForm.name || undefined,
        discountType: editForm.discountType,
        discountValue: editForm.discountValue,
        usageLimit: editForm.usageLimit,
        description: editForm.description || undefined,
        isActive: editingVoucher.isActive,
        applicableBranches: applicableBranches.length > 0 ? applicableBranches as any : [],
      });
      toast.success("Voucher updated!");
      setEditingVoucher(null);
      setEditForm(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update voucher");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!form.code.trim()) { toast.error('Code is required'); return; }
    if (form.discountValue <= 0) { toast.error('Discount value must be greater than 0'); return; }
    if (form.branchScope === 'specific' && !form.selectedBranchId) { toast.error('Please select a branch'); return; }
    setIsSubmitting(true);
    try {
      const applicableBranches = form.branchScope === 'specific' && form.selectedBranchId
        ? [form.selectedBranchId]
        : [];
      await createVoucher({
        code: form.code.trim().toUpperCase(),
        name: form.name || undefined,
        discountType: form.discountType,
        discountValue: form.discountValue,
        usageLimit: form.usageLimit,
        description: form.description || undefined,
        applicableBranches: applicableBranches.length > 0 ? applicableBranches as any : undefined,
      });
      toast.success('Voucher created!');
      setShowAddForm(false);
      setForm({ code: '', name: '', discountType: 'percentage', discountValue: 10, usageLimit: 100, description: '', branchScope: 'all', selectedBranchId: '' });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const BranchScopeSelector = ({ scope, branchId, onChange }: { scope: string; branchId: string; onChange: (s: string, b: string) => void }) => (
    <div className="sm:col-span-2">
      <Label>Branch Availability *</Label>
      <div className="flex gap-2 mt-1 mb-2">
        <button
          type="button"
          onClick={() => onChange('all', '')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${scope === 'all' ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
        >
          <Globe className="w-4 h-4" />
          All Branches
        </button>
        <button
          type="button"
          onClick={() => onChange('specific', branchId)}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${scope === 'specific' ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
        >
          <Building2 className="w-4 h-4" />
          Specific Branch
        </button>
      </div>
      {scope === 'specific' && (
        <select
          value={branchId}
          onChange={(e) => onChange('specific', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          <option value="">Select a branch...</option>
          {branches.map((b: any) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Vouchers</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage promo codes and discounts</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4 shrink-0" />
          <span>Create Voucher</span>
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-lg">New Voucher</h2>
            <button onClick={() => setShowAddForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. FREEWASH" className="mt-1 uppercase" />
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Welcome Offer" className="mt-1" />
            </div>
            <div>
              <Label>Discount Type *</Label>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as DiscountType })} className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (GHS)</option>
                <option value="free_wash">Free Wash</option>
              </select>
            </div>
            {form.discountType !== 'free_wash' && (
              <div>
                <Label>{form.discountType === 'percentage' ? 'Percentage (%)' : 'Amount (GHS)'} *</Label>
                <Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0 })} className="mt-1" placeholder="e.g. 10" />
              </div>
            )}
            <div>
              <Label>Usage Limit *</Label>
              <Input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value === '' ? '' as any : parseInt(e.target.value) || 1 })} className="mt-1" placeholder="e.g. 100" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Internal notes" className="mt-1" />
            </div>
            <BranchScopeSelector
              scope={form.branchScope}
              branchId={form.selectedBranchId}
              onChange={(s, b) => setForm({ ...form, branchScope: s as any, selectedBranchId: b })}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Voucher
            </Button>
          </div>
        </div>
      )}

      {editingVoucher && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">Edit Voucher</h2>
              <button onClick={() => { setEditingVoucher(null); setEditForm(null); }}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Code</Label>
                <Input value={editForm.code} disabled className="mt-1 uppercase opacity-60" />
                <p className="text-xs text-muted-foreground mt-1">Code cannot be changed</p>
              </div>
              <div>
                <Label>Name (optional)</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="e.g. Welcome Offer" className="mt-1" />
              </div>
              <div>
                <Label>Discount Type</Label>
                <select value={editForm.discountType} onChange={(e) => setEditForm({ ...editForm, discountType: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (GHS)</option>
                  <option value="free_wash">Free Wash</option>
                </select>
              </div>
              {editForm.discountType !== "free_wash" && (
                <div>
                  <Label>{editForm.discountType === "percentage" ? "Percentage (%)" : "Amount (GHS)"}</Label>
                  <Input type="number" value={editForm.discountValue} onChange={(e) => setEditForm({ ...editForm, discountValue: e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0 })} className="mt-1" placeholder="e.g. 10" />
                </div>
              )}
              <div>
                <Label>Usage Limit</Label>
                <Input type="number" value={editForm.usageLimit} onChange={(e) => setEditForm({ ...editForm, usageLimit: e.target.value === '' ? '' as any : parseInt(e.target.value) || 1 })} className="mt-1" placeholder="e.g. 100" />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Internal notes" className="mt-1" />
              </div>
              <BranchScopeSelector
                scope={editForm.branchScope}
                branchId={editForm.selectedBranchId}
                onChange={(s, b) => setEditForm({ ...editForm, branchScope: s, selectedBranchId: b })}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setEditingVoucher(null); setEditForm(null); }}>Cancel</Button>
              <Button onClick={handleEdit} disabled={isEditSubmitting}>
                {isEditSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {vouchersData === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Ticket className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No vouchers yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vouchers.map((voucher: any) => {
            const isBranchSpecific = voucher.applicableBranches && voucher.applicableBranches.length > 0;
            return (
              <div key={voucher._id} className={`bg-card rounded-xl border p-6 ${voucher.isActive ? 'border-border' : 'border-border/50 opacity-60'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-xs px-2 py-1 rounded-full ${voucher.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                      {voucher.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${isBranchSpecific ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                      {isBranchSpecific ? <Building2 className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      {isBranchSpecific ? getBranchName(voucher.applicableBranches[0]) : 'All Branches'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-lg font-bold text-foreground bg-muted px-2 py-1 rounded">{voucher.code}</code>
                  <button onClick={() => copyCode(voucher.code)}><Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
                </div>
                {voucher.name && <p className="text-xs text-muted-foreground mb-1">{voucher.name}</p>}
                <p className="text-sm text-muted-foreground mb-4">
                  {voucher.discountType === 'percentage' && `${voucher.discountValue}% off`}
                  {voucher.discountType === 'fixed' && `GHS ${voucher.discountValue} off`}
                  {voucher.discountType === 'free_wash' && 'Free wash'}
                </p>
                <div className="pt-4 border-t border-border space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{voucher.usedCount ?? 0} / {voucher.usageLimit} used</span>
                      <span className="text-xs text-muted-foreground">{Math.round(((voucher.usedCount ?? 0) / voucher.usageLimit) * 100)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(((voucher.usedCount ?? 0) / voucher.usageLimit) * 100))}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleVoucher(voucher._id, voucher.isActive)} className={voucher.isActive ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}>
                      {voucher.isActive ? "Disable" : "Enable"}
                    </Button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(voucher)} className="text-muted-foreground hover:text-foreground">Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(voucher._id)} disabled={deletingId === voucher._id} className="text-destructive hover:text-destructive">
                        {deletingId === voucher._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Vouchers;
