#!/bin/sh
# ==============================================================================
# Ollama Model Initialization Script
# ==============================================================================
set -e

MODEL_NAME="${OLLAMA_MODEL:-qwen2.5:3b}"
OLLAMA_HOST="${OLLAMA_BASE_URL:-http://localhost:11434}"

echo "Checking Ollama connectivity at ${OLLAMA_HOST}..."
until curl -s "${OLLAMA_HOST}/api/tags" > /dev/null 2>&1; do
  echo "Waiting for Ollama service to become available..."
  sleep 2
done

echo "Ollama is online. Checking if model '${MODEL_NAME}' is installed..."
if curl -s "${OLLAMA_HOST}/api/tags" | grep -q "\"name\":\"${MODEL_NAME}\""; then
  echo "Model '${MODEL_NAME}' is already present in local storage."
else
  echo "Pulling model '${MODEL_NAME}' into persistent volume..."
  curl -s "${OLLAMA_HOST}/api/pull" -d "{\"name\": \"${MODEL_NAME}\"}"
  echo "Model '${MODEL_NAME}' successfully downloaded."
fi
