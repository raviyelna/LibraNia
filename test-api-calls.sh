#!/bin/bash
echo "=== Testing LibraNia HTTP API ==="
echo ""

echo "1. GET /api/providers"
curl -s http://localhost:3000/api/providers | jq .
echo ""

echo "2. POST /api/providers (add Claude)"
curl -s -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{"id":"claude","apiKey":"sk-trollllm-adc522b56099e717e3ad9572262bd8f3d33d42ae988ef8f2c4cbc2db5045b4c6","model":"claude-opus-4-7","baseURL":"https://chat.trollllm.xyz"}' | jq .
echo ""

echo "3. GET /api/providers (verify added)"
curl -s http://localhost:3000/api/providers | jq .
echo ""

echo "4. POST /api/conversations (create)"
CONV=$(curl -s -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"title":"API Test Conversation"}')
echo $CONV | jq .
CONV_ID=$(echo $CONV | jq -r '.conversation.id')
echo "Created conversation: $CONV_ID"
echo ""

echo "5. GET /api/conversations (list all)"
curl -s http://localhost:3000/api/conversations | jq .
echo ""

echo "6. GET /api/conversations/$CONV_ID (get single)"
curl -s http://localhost:3000/api/conversations/$CONV_ID | jq .
echo ""

echo "7. POST /api/chat (send message with Claude Opus 4-7)"
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"$CONV_ID\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hello in 5 words\"}],\"providerId\":\"claude\",\"model\":\"claude-opus-4-7\"}" | jq .
echo ""

echo "8. GET /api/conversations/$CONV_ID/messages (get messages)"
curl -s http://localhost:3000/api/conversations/$CONV_ID/messages | jq .
echo ""

echo "=== All tests complete ==="
