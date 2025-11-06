#!/bin/bash
# Bash script to create, activate backend_venv, install dependencies, and run multiple FastAPI microservices

set -e  # Exit immediately if any command fails

# Get current script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

VENV_PATH="$SCRIPT_DIR/backend_venv"
REQ_FILE="$SCRIPT_DIR/requirements.txt"

# Check and create virtual environment if missing
if [ ! -d "$VENV_PATH" ]; then
  echo "🧩 Creating Python virtual environment at $VENV_PATH..."
  python3 -m venv "$VENV_PATH"
fi

# Activate the virtual environment
echo "✅ Activating virtual environment..."
source "$VENV_PATH/bin/activate"

# Install dependencies
if [ -f "$REQ_FILE" ]; then
  echo "📦 Installing dependencies from requirements.txt..."
  pip install -r "$REQ_FILE"
else
  echo "⚠️ No requirements.txt found at $REQ_FILE"
fi

# Define services and their ports
declare -A SERVICES=(
  ["api-gateway"]=8000
  ["auth-service"]=8001
  ["restaurant-service"]=8002
  ["order-service"]=8003
  ["delivery-service"]=8004
  ["payment-service"]=8005
)

echo "🚀 Starting all FastAPI services..."

for SERVICE in "${!SERVICES[@]}"; do
  PORT=${SERVICES[$SERVICE]}
  SERVICE_PATH="$SCRIPT_DIR/$SERVICE"

  if [ -d "$SERVICE_PATH" ]; then
    echo "▶️ Starting $SERVICE on port $PORT..."
    (
      cd "$SERVICE_PATH" || exit
      uvicorn main:app --port "$PORT" --reload
    ) &
  else
    echo "⚠️ Directory not found: $SERVICE_PATH (Skipping)"
  fi
done

echo "✅ All FastAPI services started in background."
echo "Use 'ps aux | grep uvicorn' to check running servers."
echo "Use 'killall uvicorn' to stop all servers."
