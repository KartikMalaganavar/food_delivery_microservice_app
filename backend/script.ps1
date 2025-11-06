# PowerShell script to activate backend_venv and run multiple FastAPI microservices

# Get current script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Path to virtual environment activation script
$VenvPath = Join-Path $ScriptDir "backend_venv\Scripts\Activate.ps1"

Write-Host "Activating virtual environment..."
& $VenvPath

# Define the list of services and their ports
$services = @(
    @{ name = "api-gateway";      port = 8000 },
    @{ name = "auth-service";     port = 8001 },
    @{ name = "restaurant-service"; port = 8002 },
    @{ name = "order-service";    port = 8003 },
    @{ name = "delivery-service"; port = 8004 },
    @{ name = "payment-service";  port = 8005 },
    @{ name = "notification-service";  port = 8006 }
)

foreach ($service in $services) {
    $servicePath = Join-Path $ScriptDir $service.name
    $port = $service.port
    Write-Host "Starting $($service.name) on port $port..."

    # Each service runs in its own PowerShell window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$servicePath'; uvicorn main:app --port $port --reload"
}

Write-Host "✅ All FastAPI services started successfully."
