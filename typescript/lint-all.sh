#!/bin/bash

# Script to run all linting checks for the TypeScript Lambda project

set -e  # Exit on error

echo "Starting linting checks..."
echo "=========================="

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "Error: This script must be run from the typescript directory"
    exit 1
fi

# TypeScript/JavaScript linting
echo ""
echo "1. Running ESLint..."
echo "--------------------"
npm run lint

# CloudFormation template linting
echo ""
echo "2. Running cfn-lint..."
echo "---------------------"
if command -v cfn-lint &> /dev/null; then
    cfn-lint template.yaml
else
    echo "Warning: cfn-lint not installed. Run 'pip3 install cfn-lint' to install."
fi

# YAML linting
echo ""
echo "3. Running yamllint..."
echo "---------------------"
if command -v yamllint &> /dev/null; then
    yamllint template.yaml
else
    echo "Warning: yamllint not installed. Run 'pip3 install yamllint' to install."
fi

# SAM validation
echo ""
echo "4. Running SAM validation..."
echo "---------------------------"
if command -v sam &> /dev/null; then
    sam validate --lint
else
    echo "Warning: SAM CLI not installed. Visit https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html"
fi

echo ""
echo "=========================="
echo "All linting checks passed!"