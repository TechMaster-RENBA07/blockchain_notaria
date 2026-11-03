$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ApiUrl = "http://127.0.0.1:3001/api/health"
$WebUrl = "http://127.0.0.1:5173"

function Test-LocalPort([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $result = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        if (-not $result.AsyncWaitHandle.WaitOne(350)) {
            return $false
        }
        $client.EndConnect($result)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Wait-ForHttp([string]$Url, [int]$TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $response
            }
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }
    return $null
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "No se encontro npm. Instala Node.js 20 o posterior y vuelve a ejecutar este script."
}
if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
    throw "Falta el archivo .env. Abre PowerShell en Blockchain_Notaria, ejecuta npm run setup y guarda la contrasena inicial."
}
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    throw "Faltan las dependencias. Ejecuta npm install desde la carpeta del proyecto."
}

$envPath = Join-Path $ProjectRoot ".env"
$envValues = @{}
foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
        $name = $Matches[1]
        $value = $Matches[2].Trim()
        if ($value -match '^"(.*)"$') {
            $value = $Matches[1]
        } elseif ($value -match "^'(.*)'$") {
            $value = $Matches[1]
        }
        $envValues[$name] = $value
    }
}

$requiredSettings = @(
    "DATABASE_URL",
    "SESSION_SECRET",
    "DOCUMENT_ENCRYPTION_KEY",
    "INITIAL_ADMIN_EMAIL",
    "INITIAL_ADMIN_PASSWORD"
)
$missingSettings = @()
foreach ($setting in $requiredSettings) {
    $processValue = [Environment]::GetEnvironmentVariable($setting, "Process")
    $value = if ($null -ne $processValue) { $processValue } else { $envValues[$setting] }
    if ([string]::IsNullOrWhiteSpace($value)) {
        $missingSettings += $setting
    }
}

if ($missingSettings.Count -gt 0) {
    throw "Faltan valores obligatorios en .env: $($missingSettings -join ', '). Restaura la DOCUMENT_ENCRYPTION_KEY original desde un respaldo; no generes otra si necesitas abrir archivos ya cifrados."
}

$sessionSecret = [Environment]::GetEnvironmentVariable("SESSION_SECRET", "Process")
if ($null -eq $sessionSecret) { $sessionSecret = $envValues["SESSION_SECRET"] }
if ($sessionSecret.Length -lt 32) {
    throw "SESSION_SECRET debe tener al menos 32 caracteres. Configúrala en .env."
}

$encryptionKey = [Environment]::GetEnvironmentVariable("DOCUMENT_ENCRYPTION_KEY", "Process")
if ($null -eq $encryptionKey) { $encryptionKey = $envValues["DOCUMENT_ENCRYPTION_KEY"] }
try {
    $keyBytes = [Convert]::FromBase64String($encryptionKey)
} catch {
    throw "DOCUMENT_ENCRYPTION_KEY no tiene un formato Base64 válido. Restaura la clave original desde un respaldo."
}
if ($keyBytes.Length -ne 32) {
    throw "DOCUMENT_ENCRYPTION_KEY debe representar exactamente 32 bytes. Restaura la clave original desde un respaldo."
}

$adminPassword = [Environment]::GetEnvironmentVariable("INITIAL_ADMIN_PASSWORD", "Process")
if ($null -eq $adminPassword) { $adminPassword = $envValues["INITIAL_ADMIN_PASSWORD"] }
if ($adminPassword.Length -lt 12) {
    throw "INITIAL_ADMIN_PASSWORD debe tener al menos 12 caracteres. Configúrala en .env."
}

$escapedRoot = $ProjectRoot.Replace("'", "''")
$startedApi = $false
$startedWeb = $false

if (-not (Test-LocalPort 3001)) {
    $apiCommand = "Set-Location -LiteralPath '$escapedRoot'; npm run dev:api"
    Start-Process -FilePath "powershell.exe" -WorkingDirectory $ProjectRoot -ArgumentList @(
        "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $apiCommand
    ) | Out-Null
    $startedApi = $true
}

if (-not (Test-LocalPort 5173)) {
    $webCommand = "Set-Location -LiteralPath '$escapedRoot'; npm run dev:web"
    Start-Process -FilePath "powershell.exe" -WorkingDirectory $ProjectRoot -ArgumentList @(
        "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $webCommand
    ) | Out-Null
    $startedWeb = $true
}

Write-Host "Esperando que la API y la interfaz esten disponibles..." -ForegroundColor Cyan
$apiResponse = Wait-ForHttp $ApiUrl 60
$webResponse = Wait-ForHttp $WebUrl 60

if (-not $apiResponse) {
    throw "La API no respondio en 60 segundos. Revisa la ventana de la API y el archivo .env."
}
if (-not $webResponse) {
    throw "La interfaz no respondio en 60 segundos. Revisa la ventana web."
}

$health = $apiResponse.Content | ConvertFrom-Json
if ($health.status -ne "ok" -or $health.database -ne "sqlite-connected") {
    throw "La respuesta de API no indica una base SQLite lista. Revisa los servicios iniciados."
}
if ($webResponse.Content -notmatch "<title>Nexo Notarial") {
    throw "El puerto web respondio, pero no parece ser la interfaz de Blockchain Notaria."
}
Write-Host "API: $($health.status) | Base de datos: $($health.database) | Blockchain: $($health.blockchain)" -ForegroundColor Green
if ($health.blockchain -ne "configured") {
    Write-Warning "Blockchain no esta configurada. Los registros se guardaran localmente sin anclaje en cadena."
}
if ($startedApi) { Write-Host "Se abrio una ventana de PowerShell para la API." }
if ($startedWeb) { Write-Host "Se abrio una ventana de PowerShell para la interfaz." }
Write-Host "Aplicacion: $WebUrl" -ForegroundColor Green
Start-Process $WebUrl
