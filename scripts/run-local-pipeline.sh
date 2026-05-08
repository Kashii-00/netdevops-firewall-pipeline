#!/bin/bash

set -e

RULE_FILE=$1

if [ -z "$RULE_FILE" ]; then
  echo "Usage: ./scripts/run-local-pipeline.sh <rule-file>"
  exit 1
fi

echo "=========================================="
echo "NetDevOps Firewall Change Pipeline Started"
echo "=========================================="
echo "Rule file: $RULE_FILE"
echo ""

echo "Stage 1: Validating rule..."
node scripts/validate-rule.js "$RULE_FILE"
echo ""

echo "Stage 2: Deploying rule to pfSense staging firewall..."
node scripts/deploy-rule.js "$RULE_FILE"
echo ""

echo "Stage 3: Verifying rule exists in pfSense..."
node scripts/verify-rule.js "$RULE_FILE"
echo ""

echo "=========================================="
echo "Pipeline completed successfully"
echo "=========================================="
