require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const https = require("https");

const rulePath = process.argv[2];

if (!rulePath) {
  console.error("Usage: node scripts/deploy-rule.js <rule-file>");
  process.exit(1);
}

const PFSENSE_URL = process.env.PFSENSE_URL;
const PFSENSE_API_KEY = process.env.PFSENSE_API_KEY;

if (!PFSENSE_URL || !PFSENSE_API_KEY) {
  console.error("Missing PFSENSE_URL or PFSENSE_API_KEY in .env");
  process.exit(1);
}

const rawRule = JSON.parse(fs.readFileSync(rulePath, "utf8"));

fs.mkdirSync("logs", { recursive: true });

const { change_type, test, ...rule } = rawRule;

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

async function deployRule() {
  try {
    console.log("Deploying rule to pfSense staging firewall...");
    console.log("Rule:", rule.descr);

    const response = await client.post("/api/v2/firewall/rule", rule);

    const logData = {
      timestamp: new Date().toISOString(),
      ruleFile: rulePath,
      description: rule.descr,
      status: "deployed",
      response: response.data
    };

    fs.writeFileSync(
      "logs/last-deployment.json",
      JSON.stringify(logData, null, 2)
    );

    console.log("Rule deployed successfully.");
    console.log("Deployment log saved to logs/last-deployment.json");
  } catch (err) {
    console.error("Deployment failed.");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Response:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }

    process.exit(1);
  }
}

deployRule();
