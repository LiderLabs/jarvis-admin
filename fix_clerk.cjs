const fs = require("fs");
let src = fs.readFileSync("providers/auth-provider.tsx", "utf8");

src = src.replace('afterSignInUrl="/dashboard"', 'fallbackRedirectUrl="/dashboard"');
src = src.replace('afterSignUpUrl="/dashboard"', 'fallbackRedirectUrl="/dashboard"');

fs.writeFileSync("providers/auth-provider.tsx", src, "utf8");
console.log("Done");
