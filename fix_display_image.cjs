const fs = require("fs");
const path = "components/admin/AdminBranches.tsx";
let src = fs.readFileSync(path, "utf8");

// Fix getDisplayImage in BranchServicesPanel to pass raw storageId through
src = src.replace(
  `  const getDisplayImage = (s: any) => {
    if (s.imageUrl) return s.imageUrl
    const match = DEFAULT_IMAGES.find(d => s.name?.toLowerCase().includes(d.label.toLowerCase().split(" ")[0]))
    return match?.url || DEFAULT_IMAGES[0].url
  }

  return (
    <div className="space-y-3">
      {services === undefined`,
  `  const getDisplayImage = (s: any) => {
    if (s.imageUrl) return s.imageUrl  // raw storageId or URL — ServiceImage handles resolution
    const match = DEFAULT_IMAGES.find(d => s.name?.toLowerCase().includes(d.label.toLowerCase().split(" ")[0]))
    return match?.url || DEFAULT_IMAGES[0].url
  }

  return (
    <div className="space-y-3">
      {services === undefined`
);

fs.writeFileSync(path, src);
console.log("done");
