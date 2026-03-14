const fs = require("fs");
let src = fs.readFileSync("components/admin/PaymentTableRow.tsx", "utf8");

const old = "      {/* Payment Method */}\r\n      <TableCell className=\"whitespace-nowrap\">\r\n        <PaymentMethodBadge method={payment.paymentMethod} />\r\n      </TableCell>";

const fix = "      {/* Payment Method */}\r\n      <TableCell className=\"whitespace-nowrap\">\r\n        {(payment.order?.finalPrice != null ? payment.order.finalPrice : payment.amount) === 0 ? (\r\n          <span className=\"text-xs text-muted-foreground italic\">Free</span>\r\n        ) : (\r\n          <PaymentMethodBadge method={payment.paymentMethod} />\r\n        )}\r\n      </TableCell>";

console.log("Found:", src.includes(old));
src = src.replace(old, fix);
fs.writeFileSync("components/admin/PaymentTableRow.tsx", src, "utf8");
console.log("Done:", src.includes("Free"));
