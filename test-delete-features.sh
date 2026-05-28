#!/bin/bash
echo "=== Testing DELETE operations ==="
echo ""

# Get conversation ID from previous test
CONV_ID=$(curl -s http://localhost:3000/api/conversations | jq -r '.conversations[0].id')
echo "Using conversation ID: $CONV_ID"
echo ""

echo "1. DELETE /api/conversations/$CONV_ID"
curl -s -X DELETE http://localhost:3000/api/conversations/$CONV_ID | jq .
echo ""

echo "2. GET /api/conversations (verify deleted)"
curl -s http://localhost:3000/api/conversations | jq .
echo ""

echo "3. DELETE /api/providers/deepseek"
curl -s -X DELETE http://localhost:3000/api/providers/deepseek | jq .
echo ""

echo "4. GET /api/providers (verify deleted)"
curl -s http://localhost:3000/api/providers | jq .
echo ""

echo "=== DELETE tests complete ==="
