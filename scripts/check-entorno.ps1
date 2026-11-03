# check-entorno.ps1
# Diagnostico del entorno LOCAL (Windows, sin Docker).
# Ejecutar desde la raiz del proyecto:
#   powershell -ExecutionPolicy Bypass -File scripts/check-entorno.ps1
# ---------------------------------------------------------------------------

$script:Errors = 0

function Ok   ([string]$m) { Write-Host "  [ OK ] $m" -ForegroundColor Green }
function Fail ([string]$m) { Write-Host "  [FALLA] $m" -ForegroundColor Red; $script:Errors++ }
function Warn ([string]$m) { Write-Host "  [AVISO] $m" -ForegroundColor Yellow }

# Escribe un fragmento PHP a un archivo temporal y lo ejecuta.
# Evita los problemas de PowerShell 5.1 al pasar codigo con comillas a `php -r`.
function Invoke-PhpCode([string]$Code) {
    $file = Join-Path $env:TEMP "_blockchain_notaria_test.php"
    Set-Content -Path $file -Value $Code -Encoding UTF8
    & php $file
    $exit = $LASTEXITCODE
    Remove-Item $file -Force -ErrorAction SilentlyContinue
    return $exit
}

Write-Host "==================================================="
Write-Host " DIAGNOSTICO DEL ENTORNO - Blockchain Notaría (local)"
Write-Host "==================================================="
Write-Host ""

# --- 1. PHP y extensiones ---------------------------------------------------
Write-Host "1) PHP"
$phpExe = Get-Command php -ErrorAction SilentlyContinue
if (-not $phpExe) {
    Fail "PHP no encontrado en el PATH"
} else {
    $v = php -r 'echo PHP_VERSION;'
    if ([version]$v -ge [version]"8.3.0") {
        Ok "PHP $v (>= 8.3 requerido por Laravel 13)"
    } else {
        Fail "PHP $v es menor a 8.3"
    }
}

foreach ($ext in @('pdo_sqlite', 'sqlite3', 'openssl', 'bcmath', 'gd', 'mbstring', 'zip')) {
    $found = php -m 2>$null | Select-String -SimpleMatch $ext
    if ($found) { Ok "extension $ext" } else { Fail "falta extension $ext" }
}
Write-Host ""

# --- 2. Herramientas --------------------------------------------------------
Write-Host "2) Herramientas"
if (Get-Command composer -ErrorAction SilentlyContinue) { Ok "composer" } else { Fail "composer ausente" }
if (Get-Command node -ErrorAction SilentlyContinue)     { Ok "node" } else { Warn "node ausente (necesario para Vite/Tailwind)" }
if (Get-Command git -ErrorAction SilentlyContinue)      { Ok "git" } else { Fail "git ausente" }

$opensslCli = (Get-Command openssl -ErrorAction SilentlyContinue).Source
if (-not $opensslCli) { $opensslCli = "C:\Program Files\Git\usr\bin\openssl.exe" }
if ($opensslCli -and (Test-Path $opensslCli)) {
    Ok "openssl CLI ($opensslCli)"
} else {
    Warn "openssl CLI ausente (no critico: PHP trae la extension openssl para firmar)"
}

$mailpitExe = (Get-Command mailpit -ErrorAction SilentlyContinue).Source
if (-not $mailpitExe) { $mailpitExe = "C:\tools\mailpit\mailpit.exe" }
if ($mailpitExe -and (Test-Path $mailpitExe)) {
    Ok "mailpit ($mailpitExe)"
} else {
    Warn "mailpit ausente (revisa C:\tools\mailpit o el PATH)"
}
Write-Host ""

# --- 3. Filesystem: junction de public\storage ------------------------------
Write-Host "3) Filesystem (junction public\storage)"
if (Test-Path public\storage) {
    $item = Get-Item public\storage -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Ok "public\storage es una junction valida"
    } else {
        Warn "public\storage existe pero no es junction; si los PDFs no se ven, ejecuta: php artisan storage:link"
    }
} else {
    Fail "falta la junction public\storage -> ejecuta: php artisan storage:link"
}
Write-Host ""

# --- 4. SQLite en modo WAL --------------------------------------------------
Write-Host "4) SQLite WAL (concurrencia lector/escritor)"
$testdb = (Join-Path $env:TEMP "_t_wal.sqlite").Replace('\', '/')
Remove-Item "$testdb*" -Force -ErrorAction SilentlyContinue
$walCode = @"
<?php
try {
    `$p = new PDO('sqlite:$testdb');
    echo `$p->query('PRAGMA journal_mode=WAL')->fetchColumn();
} catch (Exception `$e) {
    echo 'ERROR';
}
"@
$mode = Invoke-PhpCode $walCode
if ($mode -eq 'wal') {
    Ok "journal_mode=WAL activo"
} else {
    Fail "WAL no se pudo activar (quedo en '$mode'). Revisa que el disco sea NTFS y no una red/USB."
}
Remove-Item "$testdb*" -Force -ErrorAction SilentlyContinue
Write-Host ""

# --- 5. Base de datos y servicios de red ------------------------------------
Write-Host "5) Base de datos y servicios locales"
if (Test-Path database\database.sqlite) { Ok "database/database.sqlite existe" } else { Fail "falta database/database.sqlite (ejecuta: php artisan migrate)" }

$mp = Test-NetConnection -ComputerName 127.0.0.1 -Port 1025 -WarningAction SilentlyContinue -InformationLevel Quiet
if ($mp) { Ok "Mailpit SMTP alcanzable en 127.0.0.1:1025" } else { Warn "Mailpit apagado (ejecuta: mailpit, o scripts/servir.ps1)" }
Write-Host ""

# --- 6. Capacidad criptografica ---------------------------------------------
Write-Host "6) Criptografía (firma de registros técnicos)"
if (-not $env:OPENSSL_CONF) {
    $phpDir = Split-Path (Get-Command php).Source -Parent
    $cand = Join-Path $phpDir 'extras\ssl\openssl.cnf'
    if (Test-Path $cand) {
        $env:OPENSSL_CONF = $cand
        Warn "OPENSSL_CONF no definido en el PATH; usando $cand para este diagnostico"
    }
}
$cryptoCode = @"
<?php
`$k = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
if (!`$k) { exit(1); }
openssl_sign('prueba', `$sig, `$k, OPENSSL_ALGO_SHA256);
`$d = openssl_pkey_get_details(`$k);
exit(openssl_verify('prueba', `$sig, `$d['key'], OPENSSL_ALGO_SHA256) === 1 ? 0 : 1);
"@
if ((Invoke-PhpCode $cryptoCode) -eq 0) {
    Ok "generacion de claves RSA + firma + verificacion SHA-256"
} else {
    Fail "el ciclo de firma OpenSSL fallo"
}

php -r 'exit(strlen(hash(''sha256'',''x''))===64?0:1);'
if ($LASTEXITCODE -eq 0) { Ok "hash SHA-256 disponible (encadenamiento de bloques)" } else { Fail "SHA-256 no disponible" }
Write-Host ""

# --- Resultado --------------------------------------------------------------
Write-Host "==================================================="
if ($script:Errors -eq 0) {
    Write-Host " RESULTADO: entorno APTO. Puedes continuar." -ForegroundColor Green
} else {
    Write-Host " RESULTADO: $($script:Errors) problema(s) critico(s)." -ForegroundColor Red
}
Write-Host "==================================================="
exit $script:Errors