# Auditoría técnica pre-release (producción)

Fecha: 2026-03-02
Alcance: contratos API, fuente de `riskScore`, manejo de fechas de negocio, sobrelectura Firestore, observabilidad y mutaciones de estado.

## Resultado ejecutivo

Estado: **No listo para producción**.

Hallazgos críticos:
1. Contratos API no unificados con los DTOs de dominio.
2. Presencia de defaults/placeholder en respuestas de negocio.
3. Riesgo de sobrelectura de Firestore en endpoints clave.
4. Mutación silenciosa en `markAlertSent` (errores parciales ocultos).
5. `lastUpdatedAt` puede ser sintetizado con `new Date().toISOString()` en capa de lectura.

