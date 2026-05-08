const fs = require("fs");

const rulePath = process.argv[2];

if (!rulePath) {
  console.error("Usage: node scripts/validate-rule.js <rule-file>");
  process.exit(1);
}

let rule;

try {
  rule = JSON.parse(fs.readFileSync(rulePath, "utf8"));
} catch (err) {
  console.error("Invalid JSON:", err.message);
  process.exit(1);
}

const requiredFields = [
  "interface",
  "type",
  "ipprotocol",
  "protocol",
  "source",
  "destination",
  "descr"
];

const missing = requiredFields.filter((field) => !rule[field]);

if (missing.length > 0) {
  console.error("Validation failed. Missing fields:", missing.join(", "));
  process.exit(1);
}

if (!Array.isArray(rule.interface)) {
  console.error("Validation failed. interface must be an array, example: [\"lan\"]");
  process.exit(1);
}

const allowedTypes = ["pass", "block", "reject"];
if (!allowedTypes.includes(rule.type)) {
  console.error("Validation failed. type must be pass, block, or reject");
  process.exit(1);
}

console.log("Rule validation passed:", rule.descr);
