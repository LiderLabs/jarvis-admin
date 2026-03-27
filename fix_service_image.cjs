const fs = require("fs");
const path = "components/admin/AdminBranches.tsx";
let src = fs.readFileSync(path, "utf8");

// Add ServiceImage component after ServiceImagePicker closing and before CustomerVisibilityToggle
const newComponent = `
// ─── Service Image Resolver ───────────────────────────────────────────────────
const ServiceImage = ({ imageUrl, alt, className }: { imageUrl: string; alt: string; className: string }) => {
  const isStorageId = imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/") && !imageUrl.startsWith("convex-storage:")
  const storageUrl = useQuery(
    api.admin.getServiceImageUrl,
    isStorageId ? { storageId: imageUrl as any } : "skip"
  )
  const resolvedUrl = isStorageId ? (storageUrl ?? null) : imageUrl
  if (!resolvedUrl) return <div className={className + " bg-muted flex items-center justify-center"}><ImagePlus className="h-4 w-4 text-muted-foreground" /></div>
  return <img src={resolvedUrl} alt={alt} className={className} />
}

`;

src = src.replace(
  "// ─── Customer Visibility Toggle",
  newComponent + "// ─── Customer Visibility Toggle"
);

// Replace all service image tags in BranchServicesPanel list view
src = src.replace(
  `                  <img src={getDisplayImage(s)} alt={s.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />`,
  `                  <ServiceImage imageUrl={getDisplayImage(s)} alt={s.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />`
);

// Replace in ServiceDraftsPanel list view
src = src.replace(
  `                  <img src={getDisplayImage(d)} alt={d.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />`,
  `                  <ServiceImage imageUrl={getDisplayImage(d)} alt={d.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />`
);

fs.writeFileSync(path, src);
console.log("ServiceImage component:", src.includes("const ServiceImage") ? "YES" : "NO");
console.log("Used in services panel:", src.includes("ServiceImage imageUrl={getDisplayImage(s)}") ? "YES" : "NO");
