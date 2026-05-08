require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const https = require("https");

const rulePath = process.argv[2];

if (!rulePath) {
  console.error("Usage: node scripts/verify-rule.js <rule-file>");
  process.exit(1);
}

const PFSENSE_URL = process.env.PFSENSE_URL;
const PFSENSE_API_KEY = process.env.PFSENSE_API_KEY;

if (!PFSENSE_URL || !PFSENSE_API_KEY) {
  console.error("Missing PFSENSE_URL or PFSENSE_API_KEY in .env");
  process.exit(1);
}

const expectedRule = JSON.parse(fs.readFileSync(rulePath, "utf8"));

const client = axios.create({
  baseURL: PFSENSE_URL,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  headers: {
    "X-API-Key": PFSENSE_API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  timeout: 15000
});

function extractRules(apiResponse) {
  if (Array.isArray(apiResponse)) return apiResponse;

  if (apiResponse && Array.isArray(apiResponse.data)) return apiResponse.data;

  if (apiResponse && apiResponse.data && Array.isArray(apiResponse.data.rules)) {
    return apiResponse.data.rules;
  }

  if (apiResponse && Array.isArray(apiResponse.response)) return apiResponse.response;

  return [];
}

async function verifyRule() {
  try {
    console.log("Verifying rule exists in pfSense...");
    console.log("Expected description:", expectedRule.descr);

    const response = await client.get("/api/v2/firewall/rules");

    const rules = extractRules(response.data);

    fs.writeFileSync(
      "logs/firewall-rules-response.json",
      JSON.stringify(response.data, null, 2)
    );

    const foundRule = rules.find((rule) => {
      return String(rule.descr || rule.description || "").trim() === expectedRule.descr.trim();
    });

    if (!foundRule) {
      console.error("Verification failed. Rule was not found in pfSense.");
      console.error("Full rules response saved to logs/firewall-rules-response.json");
      process.exit(1);
    }

    const verificationLog = {
      timestamp: new Date().toISOString(),
      ruleFile: rulePath,
      status: "verified",
      matchedRule: foundRule
    };

    fs.writeFileSync(
      "logs/last-verification.json",
      JSON.stringify(verificationLog, null, 2)
    );

    console.log("Rule verification passed.");
    console.log("Verification log saved to logs/last-verification.json");
  } catch (err) {
    console.error("Verification failed.");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Response:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }

    process.exit(1);
  }
}

verifyRule();
