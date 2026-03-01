const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminBranches.tsx", "utf8");

// Fix 1: Remove imageDataUrl reference
src = src.replace(
  "{ ...d, name: form.name, code: toServiceCode(form.name), price: form.price, imageDataUrl: imageDataUrl ?? d.imageDataUrl }",
  "{ ...d, name: form.name, code: toServiceCode(form.name), price: form.price }"
);

// Fix 2 & 3: Move BranchFormFields outside component and add props
src = src.replace(
  `  const BranchFormFields = ({ prefix = "" }: { prefix?: string }) => (`,
  `// moved outside - see below`
);

// Insert BranchFormFields as standalone component before AdminBranches
const standaloneComponent = `
const BranchFormFields = ({ prefix = "", formData, setFormData, selectedBranch }: {
  prefix?: string;
  formData: any;
  setFormData: (data: any) => void;
  selectedBranch: any;
}) => (
`;

src = src.replace(
  `// ─── Main Component ───────────────────────────────────────────────────────────`,
  `// ─── Main Component ───────────────────────────────────────────────────────────` + "\n" + standaloneComponent.replace(/\n$/, "")
);

// Fix usages to pass props
src = src.replace(
  `<BranchFormFields prefix="" />`,
  `<BranchFormFields prefix="" formData={formData} setFormData={setFormData} selectedBranch={selectedBranch} />`
);
src = src.replace(
  `<BranchFormFields prefix="edit-" />`,
  `<BranchFormFields prefix="edit-" formData={formData} setFormData={setFormData} selectedBranch={selectedBranch} />`
);

fs.writeFileSync("components/admin/AdminBranches.tsx", src, "utf8");
console.log("Fix 1 (imageDataUrl):", !src.includes("imageDataUrl ?? d.imageDataUrl"));
console.log("Fix 2 (moved outside):", src.includes("const BranchFormFields = ({ prefix = \"\", formData"));
console.log("Fix 3 (props passed):", src.includes("formData={formData} setFormData={setFormData}"));
