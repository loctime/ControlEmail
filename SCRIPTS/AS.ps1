<#
.SYNOPSIS
  Reconstruye métricas agregadas en ControlFile llamando POST /api/dashboard/aggregate-day por cada día del rango.

.DESCRIPTION
  El backend ControlFile (Render) expone aggregate-day para escribir en metrics/daily (y derivar monthly/yearly).
  Este script recorre cada fecha y dispara esa agregación.
  Autenticación: -FirebaseToken (Bearer) o token obtenido con -ServiceAccountPath vía gcloud.

.PARAMETER BaseUrl
  URL base del backend ControlFile (por defecto https://controlfile.onrender.com).

.PARAMETER StartDate
  Primera fecha del rango (YYYY-MM-DD).

.PARAMETER EndDate
  Última fecha del rango (YYYY-MM-DD).

.PARAMETER FirebaseToken
  Token Bearer (Firebase ID token o OAuth2). Si no se pasa y se usa -ServiceAccountPath, se intenta obtener con gcloud.

.PARAMETER ServiceAccountPath
  Ruta al JSON de la service account (ej. serviceAccountKey-controlfile.json). Si se indica y gcloud está instalado,
  se obtiene un access token con: gcloud auth activate-service-account --key-file=... ; gcloud auth print-access-token.

.EXAMPLE
  .\AS.ps1 -StartDate "2026-01-01" -EndDate "2026-03-09"
  (Sin auth; solo funciona si el endpoint no exige token.)

.EXAMPLE
  .\AS.ps1 -StartDate "2026-01-01" -EndDate "2026-03-09" -FirebaseToken "eyJhbG..."
  (Con token explícito.)

.EXAMPLE
  .\AS.ps1 -StartDate "2026-01-01" -EndDate "2026-03-09" -ServiceAccountPath ".\serviceAccountKey-controlfile.json"
  (Obtiene token con gcloud si está instalado.)
#>

param(
    [string]$BaseUrl = "https://controlfile.onrender.com",
    [string]$StartDate = "2025-01-01",
    [string]$EndDate = "2026-12-31",
    [string]$FirebaseToken = "",
    [string]$ServiceAccountPath = ""
)

function Get-DateRange($start, $end) {
    $dates = @()
    $current = Get-Date $start
    $last = Get-Date $end
    while ($current -le $last) {
        $dates += $current.ToString("yyyy-MM-dd")
        $current = $current.AddDays(1)
    }
    return $dates
}

# Resolver token: explícito o desde service account vía gcloud
$token = $FirebaseToken
if ([string]::IsNullOrWhiteSpace($token) -and -not [string]::IsNullOrWhiteSpace($ServiceAccountPath)) {
    $keyFile = $ServiceAccountPath
    if (-not [System.IO.Path]::IsPathRooted($keyFile)) {
        $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
        $keyFile = Join-Path $scriptDir $ServiceAccountPath
    }
    if (Test-Path $keyFile) {
        try {
            & gcloud auth activate-service-account --key-file="$keyFile" 2>$null | Out-Null
            $token = ((& gcloud auth print-access-token 2>$null) -join "").Trim()
        } catch {
            # gcloud no disponible o fallo
        }
        if ([string]::IsNullOrWhiteSpace($token)) {
            Write-Host "No se pudo obtener token con gcloud. Pasa -FirebaseToken o instala gcloud y usa -ServiceAccountPath con la ruta al JSON."
        }
    } else {
        Write-Host "No se encontró el archivo de service account: $keyFile"
    }
}

$allDates = Get-DateRange $StartDate $EndDate

Write-Host "Reconstruyendo métricas desde $StartDate hasta $EndDate"
Write-Host "Total días: $($allDates.Count)"
if (-not [string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Usando token Bearer (auth habilitada)."
} else {
    Write-Host "Sin token; si el endpoint exige auth, las peticiones pueden fallar."
}

$headers = @{}
if (-not [string]::IsNullOrWhiteSpace($token)) {
    $headers["Authorization"] = "Bearer $token"
}

$ok = 0
$err = 0
foreach ($date in $allDates) {
    $url = "$BaseUrl/api/dashboard/aggregate-day?date=$date"
    try {
        $response = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ErrorAction Stop
        Write-Host "OK $date"
        $ok++
    }
    catch {
        Write-Host "ERROR $date - $($_.Exception.Message)"
        $err++
    }
}

Write-Host "Proceso terminado. OK: $ok, ERROR: $err"
