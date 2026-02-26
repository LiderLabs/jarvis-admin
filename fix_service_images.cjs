const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminBranches.tsx", "utf8");

// 1. Add ImagePlus to lucide imports
src = src.replace(
  `  Tag,\n}`,
  `  Tag,\n  ImagePlus,\n  X as XIcon,\n}`
);

// 2. Add imageUrl to ServiceDraft interface
src = src.replace(
  `interface ServiceDraft {\n  id: string\n  name: string\n  code: string\n  price: number\n}`,
  `interface ServiceDraft {\n  id: string\n  name: string\n  code: string\n  price: number\n  imageDataUrl?: string\n}`
);

// 3. Add image state to BranchServicesPanel form state and image helpers
src = src.replace(
  `  const [showAdd, setShowAdd] = useState(false)\n  const [editingId, setEditingId] = useState<Id<"branchServices"> | null>(null)\n  const [form, setForm] = useState({ name: "", price: 0 })\n\n  const resetForm = () => setForm({ name: "", price: 0 })`,
  `  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<Id<"branchServices"> | null>(null)
  const [form, setForm] = useState({ name: "", price: 0 })
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)

  const resetForm = () => { setForm({ name: "", price: 0 }); setImageDataUrl(null) }

  const getServiceImage = (serviceId: string) => {
    try { return localStorage.getItem(\`washlab_svc_img_\${serviceId}\`) } catch { return null }
  }
  const saveServiceImage = (serviceId: string, dataUrl: string | null) => {
    try {
      if (dataUrl) localStorage.setItem(\`washlab_svc_img_\${serviceId}\`, dataUrl)
      else localStorage.removeItem(\`washlab_svc_img_\${serviceId}\`)
    } catch {}
  }

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>, onDone: (url: string) => void) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === "string") onDone(reader.result) }
    reader.readAsDataURL(file)
  }`
);

// 4. Save image on add service
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
  `      const newSvc = await createBranchService({
        branchId,
        name: form.name.trim(),
        code: toServiceCode(form.name),
        price: form.price,
      })
      if (imageDataUrl && newSvc) saveServiceImage(String(newSvc), imageDataUrl)
      toast.success("Service added")
      setShowAdd(false)
      resetForm()`
);

// 5. Save image on update service
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
      })
      saveServiceImage(String(editingId), imageDataUrl)
      toast.success("Service updated")
      setEditingId(null)
      resetForm()`
);

// 6. Load image when starting edit
src = src.replace(
  `  const startEdit = (s: any) => {
    setEditingId(s._id)
    setForm({ name: s.name, price: s.price })
    setShowAdd(false)
  }`,
  `  const startEdit = (s: any) => {
    setEditingId(s._id)
    setForm({ name: s.name, price: s.price })
    setImageDataUrl(getServiceImage(String(s._id)))
    setShowAdd(false)
  }`
);

// 7. Add image thumbnail to service row display and image picker in add/edit form
// Replace the service row display section to show image thumbnail
src = src.replace(
  `              ) : (
                <div className="flex-1">
                  <span className="font-medium text-sm">{s.name}</span>
                  {!s.isActive && <Badge variant="outline" className="text-xs ml-2">Inactive</Badge>}
                </div>
              )}`,
  `              ) : (
                <div className="flex items-center gap-2 flex-1">
                  {getServiceImage(String(s._id)) ? (
                    <img src={getServiceImage(String(s._id))!} alt={s.name} className="w-8 h-8 rounded-md object-cover border flex-shrink-0" />
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

// 8. Add image picker to the Add Service form (inside BranchServicesPanel)
src = src.replace(
  `          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Service</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>    
          </div>`,
  `          <div className="space-y-2">
            <Label className="text-xs">Service Image (optional)</Label>
            {imageDataUrl ? (
              <div className="relative w-20 h-20">
                <img src={imageDataUrl} className="w-20 h-20 rounded-lg object-cover border" />
                <button onClick={() => setImageDataUrl(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center">
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer w-fit px-3 py-1.5 border border-dashed rounded-lg text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <ImagePlus className="w-3.5 h-3.5" />
                Upload image
                <input type="file" accept="image/*" className="hidden" onChange={e => handleImagePick(e, setImageDataUrl)} />
              </label>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Service</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>
          </div>`
);

// 9. Add image state and helpers to ServiceDraftsPanel
src = src.replace(
  `  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", price: 0 })
  const [editId, setEditId] = useState<string | null>(null)

  const resetForm = () => setForm({ name: "", price: 0 })`,
  `  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", price: 0 })
  const [editId, setEditId] = useState<string | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)

  const resetForm = () => { setForm({ name: "", price: 0 }); setImageDataUrl(null) }

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>, onDone: (url: string) => void) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === "string") onDone(reader.result) }
    reader.readAsDataURL(file)
  }`
);

// 10. Add image to draft on add
src = src.replace(
  `    const newDraft: ServiceDraft = {
      id: \`draft_\${Date.now()}\`,
      name: form.name.trim(),
      code: toServiceCode(form.name),
      price: form.price,
    }
    onChange([...drafts, newDraft])
    setShowAdd(false)
    resetForm()`,
  `    const newDraft: ServiceDraft = {
      id: \`draft_\${Date.now()}\`,
      name: form.name.trim(),
      code: toServiceCode(form.name),
      price: form.price,
      imageDataUrl: imageDataUrl ?? undefined,
    }
    onChange([...drafts, newDraft])
    setShowAdd(false)
    resetForm()`
);

// 11. Add image to draft on update
src = src.replace(
  `    onChange(drafts.map(d => d.id === editId ? { ...d, name: form.name, code: toServiceCode(form.name), price: form.price } : d))`,
  `    onChange(drafts.map(d => d.id === editId ? { ...d, name: form.name, code: toServiceCode(form.name), price: form.price, imageDataUrl: imageDataUrl ?? d.imageDataUrl } : d))`
);

// 12. Load image when editing draft
src = src.replace(
  `  const startEdit = (d: ServiceDraft) => {
    setEditId(d.id)
    setForm({ name: d.name, price: d.price })
    setShowAdd(false)
  }`,
  `  const startEdit = (d: ServiceDraft) => {
    setEditId(d.id)
    setForm({ name: d.name, price: d.price })
    setImageDataUrl(d.imageDataUrl ?? null)
    setShowAdd(false)
  }`
);

// 13. Show image thumbnail in draft row
src = src.replace(
  `              ) : (
                <div className="flex-1">
                  <span className="font-medium text-sm">{d.name}</span>
                </div>
              )}`,
  `              ) : (
                <div className="flex items-center gap-2 flex-1">
                  {d.imageDataUrl ? (
                    <img src={d.imageDataUrl} alt={d.name} className="w-8 h-8 rounded-md object-cover border flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-medium text-sm">{d.name}</span>
                </div>
              )}`
);

// 14. Add image picker to draft Add Service form
src = src.replace(
  `          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Service</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>    
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed" onClick={() => { setShowAdd(true); setEditId(null) }}>`,
  `          <div className="space-y-2">
            <Label className="text-xs">Service Image (optional)</Label>
            {imageDataUrl ? (
              <div className="relative w-20 h-20">
                <img src={imageDataUrl} className="w-20 h-20 rounded-lg object-cover border" />
                <button onClick={() => setImageDataUrl(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center">
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer w-fit px-3 py-1.5 border border-dashed rounded-lg text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <ImagePlus className="w-3.5 h-3.5" />
                Upload image
                <input type="file" accept="image/*" className="hidden" onChange={e => handleImagePick(e, setImageDataUrl)} />
              </label>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add Service</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAdd(false); resetForm() }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed" onClick={() => { setShowAdd(true); setEditId(null) }}>`
);

// 15. Save draft images to localStorage when branch is created
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
        const newSvcId = await createBranchService({
          branchId: branchId as Id<"branches">,
          name: draft.name,
          code: draft.code,
          price: draft.price,
        })
        if (draft.imageDataUrl && newSvcId) {
          try { localStorage.setItem(\`washlab_svc_img_\${String(newSvcId)}\`, draft.imageDataUrl) } catch {}
        }
      }`
);

fs.writeFileSync("components/admin/AdminBranches.tsx", src, "utf8");
console.log("Done");
