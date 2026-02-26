const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminBranches.tsx", "utf8");

// 1. Add ImagePlus to lucide imports
src = src.replace(
  `  Tag,\n}`,
  `  Tag,\n  ImagePlus,\n  Link as LinkIcon,\n}`
);

// 2. Add imageUrl to ServiceDraft interface
src = src.replace(
  `interface ServiceDraft {\n  id: string\n  name: string\n  code: string\n  price: number\n}`,
  `interface ServiceDraft {\n  id: string\n  name: string\n  code: string\n  price: number\n  imageUrl?: string\n}`
);

// 3. Add imageUrl state to BranchServicesPanel
src = src.replace(
  `  const [showAdd, setShowAdd] = useState(false)\n  const [editingId, setEditingId] = useState<Id<"branchServices"> | null>(null)\n  const [form, setForm] = useState({ name: "", price: 0 })\n\n  const resetForm = () => setForm({ name: "", price: 0 })`,
  `  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<Id<"branchServices"> | null>(null)
  const [form, setForm] = useState({ name: "", price: 0, imageUrl: "" })

  const resetForm = () => setForm({ name: "", price: 0, imageUrl: "" })`
);

// 4. Pass imageUrl on add in BranchServicesPanel
src = src.replace(
  `      await createBranchService({
        branchId,
        name: form.name.trim(),
        code: toServiceCode(form.name),
        price: form.price,
      })
      toast.success("Service added")
      setShowAdd(false)
      resetForm()`,
  `      await createBranchService({
        branchId,
        name: form.name.trim(),
        code: toServiceCode(form.name),
        price: form.price,
        imageUrl: form.imageUrl.trim() || undefined,
      } as any)
      toast.success("Service added")
      setShowAdd(false)
      resetForm()`
);

// 5. Pass imageUrl on update in BranchServicesPanel
src = src.replace(
  `      await updateBranchService({
        serviceId: editingId,
        name: form.name.trim(),
        price: form.price,
      })
      toast.success("Service updated")
      setEditingId(null)
      resetForm()`,
  `      await updateBranchService({
        serviceId: editingId,
        name: form.name.trim(),
        price: form.price,
        imageUrl: form.imageUrl.trim() || undefined,
      } as any)
      toast.success("Service updated")
      setEditingId(null)
      resetForm()`
);

// 6. Load imageUrl when starting edit in BranchServicesPanel
src = src.replace(
  `  const startEdit = (s: any) => {
    setEditingId(s._id)
    setForm({ name: s.name, price: s.price })
    setShowAdd(false)
  }`,
  `  const startEdit = (s: any) => {
    setEditingId(s._id)
    setForm({ name: s.name, price: s.price, imageUrl: s.imageUrl || "" })
    setShowAdd(false)
  }`
);

// 7. Show image thumbnail in existing service row
src = src.replace(
  `              ) : (
                <div className="flex-1">
                  <span className="font-medium text-sm">{s.name}</span>
                  {!s.isActive && <Badge variant="outline" className="text-xs ml-2">Inactive</Badge>}
                </div>
              )}`,
  `              ) : (
                <div className="flex items-center gap-2 flex-1">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.name} className="w-8 h-8 rounded-md object-cover border flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-medium text-sm">{s.name}</span>
                  {!s.isActive && <Badge variant="outline" className="text-xs ml-2">Inactive</Badge>}
                </div>
              )}`
);

// 8. Add imageUrl input to inline edit row in BranchServicesPanel
src = src.replace(
  `              ) : (
                <div className="flex-1 grid grid-cols-2 gap-2 mr-2">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Service name"
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    placeholder="Price"
                    className="h-8 text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>`,
  `              ) : (
                <div className="flex-1 grid grid-cols-3 gap-2 mr-2">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Service name"
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    placeholder="Price"
                    className="h-8 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <Input
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="Image URL (optional)"
                    className="h-8 text-sm"
                  />
                </div>`
);

// 9. Add imageUrl field to the Add Service form in BranchServicesPanel
src = src.replace(
  `          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Service Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Wash & Dry"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price per load (&#8373;) *</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Service</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>    
          </div>`,
  `          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Service Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Wash & Dry"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price per load (&#8373;) *</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><ImagePlus className="w-3 h-3" /> Image URL (optional)</Label>
            <div className="flex gap-2 items-center">
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="h-8 text-sm flex-1"
              />
              {form.imageUrl && (
                <img src={form.imageUrl} className="w-8 h-8 rounded-md object-cover border flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Service</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>
          </div>`
);

// 10. Add imageUrl to ServiceDraftsPanel form state
src = src.replace(
  `  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", price: 0 })
  const [editId, setEditId] = useState<string | null>(null)

  const resetForm = () => setForm({ name: "", price: 0 })`,
  `  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", price: 0, imageUrl: "" })
  const [editId, setEditId] = useState<string | null>(null)

  const resetForm = () => setForm({ name: "", price: 0, imageUrl: "" })`
);

// 11. Include imageUrl in new draft
src = src.replace(
  `    const newDraft: ServiceDraft = {
      id: \`draft_\${Date.now()}\`,
      name: form.name.trim(),
      code: toServiceCode(form.name),
      price: form.price,
    }`,
  `    const newDraft: ServiceDraft = {
      id: \`draft_\${Date.now()}\`,
      name: form.name.trim(),
      code: toServiceCode(form.name),
      price: form.price,
      imageUrl: form.imageUrl.trim() || undefined,
    }`
);

// 12. Include imageUrl in draft update
src = src.replace(
  `    onChange(drafts.map(d => d.id === editId ? { ...d, name: form.name, code: toServiceCode(form.name), price: form.price } : d))`,
  `    onChange(drafts.map(d => d.id === editId ? { ...d, name: form.name, code: toServiceCode(form.name), price: form.price, imageUrl: form.imageUrl.trim() || undefined } : d))`
);

// 13. Load imageUrl when editing draft
src = src.replace(
  `  const startEdit = (d: ServiceDraft) => {
    setEditId(d.id)
    setForm({ name: d.name, price: d.price })
    setShowAdd(false)
  }`,
  `  const startEdit = (d: ServiceDraft) => {
    setEditId(d.id)
    setForm({ name: d.name, price: d.price, imageUrl: d.imageUrl || "" })
    setShowAdd(false)
  }`
);

// 14. Show image thumbnail in draft row
src = src.replace(
  `              ) : (
                <div className="flex-1">
                  <span className="font-medium text-sm">{d.name}</span>
                </div>
              )}`,
  `              ) : (
                <div className="flex items-center gap-2 flex-1">
                  {d.imageUrl ? (
                    <img src={d.imageUrl} alt={d.name} className="w-8 h-8 rounded-md object-cover border flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-medium text-sm">{d.name}</span>
                </div>
              )}`
);

// 15. Add imageUrl field to draft Add form
src = src.replace(
  `          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Service Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Wash & Dry"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price per load (&#8373;) *</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Service</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>    
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed" onClick={() => { setShowAdd(true); setEditId(null) }}>`,
  `          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Service Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Wash & Dry"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price per load (&#8373;) *</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><ImagePlus className="w-3 h-3" /> Image URL (optional)</Label>
            <div className="flex gap-2 items-center">
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="h-8 text-sm flex-1"
              />
              {form.imageUrl && (
                <img src={form.imageUrl} className="w-8 h-8 rounded-md object-cover border flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Service</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed" onClick={() => { setShowAdd(true); setEditId(null) }}>`
);

// 16. Pass imageUrl when saving drafts on branch create
src = src.replace(
  `      for (const draft of serviceDrafts) {
        await createBranchService({
          branchId: branchId as Id<"branches">,
          name: draft.name,
          code: draft.code,
          price: draft.price,
        })
      }`,
  `      for (const draft of serviceDrafts) {
        await createBranchService({
          branchId: branchId as Id<"branches">,
          name: draft.name,
          code: draft.code,
          price: draft.price,
          imageUrl: draft.imageUrl || undefined,
        } as any)
      }`
);

fs.writeFileSync("components/admin/AdminBranches.tsx", src, "utf8");
console.log("Done");
