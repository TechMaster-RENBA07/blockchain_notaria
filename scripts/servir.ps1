# servir.ps1
# Levanta el entorno local de Blockchain Notaría sin Docker:
#   Mailpit (correo), cola de trabajos, Vite (dev) y el servidor web.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/servir.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/servir.ps1 -SinVite   (solo PHP)
# ---------------------------------------------------------------------------

param(
    [switch]$SinVite,
    [switch]$SinCola,
    [switch]$SinCorreo
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path database\database.sqlite)) {
    Write-Host "No existe la base de datos. Creandola y migrando..." -ForegroundColor Yellow
    New-Item -ItemType File database\database.sqlite -Force | Out-Null
    php artisan migrate --seed
}

Write-Host "Levantando Blockchain Notaría (local, sin Docker)..." -ForegroundColor Cyan
Write-Host "  Aplicacion: http://localhost:8000"
Write-Host "  Mailpit UI: http://localhost:8025"

if (-not $SinCorreo) {
    $mailpit = Get-Command mailpit -ErrorAction SilentlyContinue
    if ($mailpit) {
        Start-Process -FilePath "mailpit" -WindowStyle Minimized
        Write-Host "  [OK] Mailpit iniciado (SMTP 1025, UI 8025)" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] mailpit no esta en el PATH. Descargalo en C:\tools\mailpit o instalalo y reintenta." -ForegroundColor Yellow
    }
}

if (-not $SinCola) {
    Start-Process -FilePath "php" -ArgumentList "artisan", "queue:work", "--tries=3" -WorkingDirectory $root -WindowStyle Minimized
    Write-Host "  [OK] Cola de trabajos iniciada (queue:work)" -ForegroundColor Green
}

if (-not $SinVite) {
    Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $root -WindowStyle Minimized
    Write-Host "  [OK] Vite iniciado (npm run dev)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Servidor web en primer plano. Ctrl+C para detener." -ForegroundColor Cyan
php artisan serve