const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const rulePath = process.argv[2];

if (!rulePath) {
  console.error("Usage: node scripts/test-traffic.js <rule-file>");
  process.exit(1);
}

const rule = JSON.parse(fs.readFileSync(rulePath, "utf8"));

fs.mkdirSync("logs", { recursive: true });

if (!rule.test) {
  console.log("No traffic test defined for this rule. Skipping traffic test.");
  process.exit(0);
}

const test = rule.test;

const sshKeyPath =
  process.env.LAB_CLIENT_SSH_KEY_PATH ||
  path.join(os.homedir(), ".ssh", "netdevops_lab");

const sshUser = test.user || "kashika";
const sshHost = test.host || "192.168.128.100";
const expected = test.expected || "success";
const timeout = test.timeout || 5;

function runRemoteCommand(command) {
  return execFileSync(
    "ssh",
    [
      "-i",
      sshKeyPath,
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "BatchMode=yes",
      `${sshUser}@${sshHost}`,
      command
    ],
    { encoding: "utf8" }
  );
}

function saveLog(status, output, error = null) {
  fs.writeFileSync(
    "logs/last-traffic-test.json",
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        ruleFile: rulePath,
        description: rule.descr,
        test,
        status,
        output,
        error
      },
      null,
      2
    )
  );
}

try {
  console.log("Running lab traffic test...");
  console.log("Test method:", test.method);
  console.log("Client:", `${sshUser}@${sshHost}`);

  let command;

  if (test.method === "curl") {
    if (!test.url) {
      throw new Error("Curl test requires test.url");
    }

    command = `curl -sS --max-time ${timeout} "${test.url}"`;
  } else if (test.method === "ping") {
    if (!test.target) {
      throw new Error("Ping test requires test.target");
    }

    command = `ping -c 4 "${test.target}"`;
  } else {
    throw new Error(`Unsupported test method: ${test.method}`);
  }

  console.log("Remote command:", command);

  const output = runRemoteCommand(command);

  if (expected === "success") {
    if (test.contains && !output.includes(test.contains)) {
      throw new Error(`Traffic test output did not contain expected text: ${test.contains}`);
    }

    console.log("Traffic test passed.");
    console.log(output);
    saveLog("passed", output);
    process.exit(0);
  }

  if (expected === "failure") {
    console.error("Traffic test was expected to fail, but it succeeded.");
    saveLog("failed", output, "Expected failure but command succeeded");
    process.exit(1);
  }
} catch (err) {
  if (expected === "failure") {
    console.log("Traffic test failed as expected.");
    saveLog("passed", "", err.message);
    process.exit(0);
  }

  console.error("Traffic test failed.");
  console.error(err.message);
  saveLog("failed", "", err.message);
  process.exit(1);
}
