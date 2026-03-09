# Scripts

## AS.ps1 – Reconstruir métricas agregadas (ControlFile)

Llama a `POST /api/dashboard/aggregate-day?date=YYYY-MM-DD` en el backend ControlFile para cada día del rango, de modo que se rellenen las colecciones de métricas (p. ej. `metrics/daily` y derivados mensual/anual).

### Requisitos

- PowerShell
- Opcional: [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) si quieres usar la service account sin pasar el token a mano

### Uso

```powershell
cd SCRIPTS

# Rango por defecto (2025-01-01 a 2026-12-31), sin auth
.\AS.ps1

# Rango concreto
.\AS.ps1 -StartDate "2026-01-01" -EndDate "2026-03-09"

# Con token Bearer (Firebase ID token u OAuth2)
.\AS.ps1 -StartDate "2026-01-01" -EndDate "2026-03-09" -FirebaseToken "eyJhbG..."

# Usar service account (token vía gcloud)
.\AS.ps1 -StartDate "2026-01-01" -EndDate "2026-03-09" -ServiceAccountPath ".\serviceAccountKey-controlfile.json"
```

### Service account

El archivo `serviceAccountKey-controlfile.json` debe estar en esta carpeta (o indicar la ruta con `-ServiceAccountPath`). **No subas este archivo a Git**; ya está en `.gitignore`.

Si tienes `gcloud` instalado, el script puede obtener el access token con:

```powershell
gcloud auth activate-service-account --key-file=.\serviceAccountKey-controlfile.json
gcloud auth print-access-token
```

y usarlo automáticamente al pasar `-ServiceAccountPath`.

Si el backend espera un **Firebase ID token** (usuario), obtén el token desde la app (p. ej. en la consola del navegador, con el usuario logueado) y pásalo con `-FirebaseToken`.
