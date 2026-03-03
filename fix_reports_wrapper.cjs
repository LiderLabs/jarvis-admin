const fs = require("fs");
let src = fs.readFileSync("components/admin/AdminReports.tsx", "utf8");

// Add the wrapper component and fix the export
src = src.replace(
  "export default AdminReportsOverview;",
  `const AdminReports = () => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  if (selectedReportId) {
    return <AdminReportDetail reportId={selectedReportId} onBack={() => setSelectedReportId(null)} />;
  }

  return <AdminReportsOverview onViewReport={(id) => setSelectedReportId(id)} />;
};

export default AdminReports;`
);

// Check if AdminReportDetail is imported
if (!src.includes("import AdminReportDetail")) {
  src = src.replace(
    "'use client';",
    "'use client';\nimport AdminReportDetail from './AdminReportDetail';"
  );
}

fs.writeFileSync("components/admin/AdminReports.tsx", src, "utf8");
console.log("Wrapper added:", src.includes("const AdminReports = ()"));
console.log("AdminReportDetail imported:", src.includes("import AdminReportDetail"));
