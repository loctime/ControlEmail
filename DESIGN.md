# FleetGuard - Sistema de Diseño

Documentación de tokens y guías de diseño para FleetGuard Control Vehicular.

## Tokens de color

### Semánticos principales

| Token | Light (HSL) | Dark (HSL) | Uso |
|-------|-------------|------------|-----|
| `--background` | 210 20% 98% | 222 20% 7% | Fondo principal |
| `--foreground` | 220 20% 10% | 210 15% 95% | Texto principal |
| `--primary` | 215 90% 50% | 215 90% 55% | Botones, links, acentos |
| `--secondary` | 210 15% 93% | 220 15% 16% | Secundario |
| `--muted` | 210 15% 95% | 220 15% 14% | Fondos sutiles |
| `--muted-foreground` | 220 10% 46% | 215 10% 55% | Texto secundario |
| `--destructive` | 0 72% 51% | 0 72% 51% | Error, crítico |
| `--success` | 142 71% 45% | 142 71% 45% | Resuelto, activo |
| `--warning` | 38 92% 50% | 38 92% 50% | Pendiente, advertencia |
| `--border` | 214 20% 90% | 220 15% 18% | Bordes |
| `--input` | 214 20% 90% | 220 15% 18% | Bordes inputs |
| `--ring` | 215 90% 50% | 215 90% 55% | Focus |

### Tokens de estado

| Token | Mapeo | Uso |
|-------|-------|-----|
| `--status-critical` | destructive | Estado crítico de eventos |
| `--status-pending` | warning | Pendiente |
| `--status-in-review` | primary | En revisión |
| `--status-resolved` | success | Resuelto |
| `--status-active` | success | Vehículo activo |
| `--status-inactive` | muted | Inactivo |
| `--status-maintenance` | warning | Mantenimiento |

## Escala tipográfica

| Variable | Valor | Uso |
|----------|-------|-----|
| `--text-xs` | 0.75rem (12px) | Captions, labels pequeños |
| `--text-sm` | 0.875rem (14px) | Labels, metadatos |
| `--text-base` | 1rem (16px) | Cuerpo de texto |
| `--text-lg` | 1.125rem (18px) | Subtítulos |
| `--text-xl` | 1.25rem (20px) | Títulos de sección |
| `--text-2xl` | 1.5rem (24px) | Títulos principales |

**Mínimo recomendado:** 14px para texto secundario. Evitar tamaños inferiores a 12px.

## Espaciados

| Variable | Valor | Uso |
|----------|-------|-----|
| `--space-1` | 0.25rem (4px) | Gaps mínimos |
| `--space-2` | 0.5rem (8px) | Entre elementos cercanos |
| `--space-3` | 0.75rem (12px) | Entre elementos relacionados |
| `--space-4` | 1rem (16px) | Entre bloques |
| `--space-5` | 1.25rem (20px) | |
| `--space-6` | 1.5rem (24px) | Entre secciones |
| `--space-8` | 2rem (32px) | Page padding horizontal |
| `--space-10` | 2.5rem (40px) | Page padding vertical |

## Sombras

| Variable | Uso |
|----------|-----|
| `--shadow-sm` | Cards default |
| `--shadow-md` | Modals, dropdowns |
| `--shadow-lg` | Overlays |

## Modo claro / oscuro

- **ThemeProvider:** `next-themes` con `storageKey="fleetguard-theme"`
- **Persistencia:** localStorage
- **Toggle:** Componente `ThemeToggle` en navbar

## Accesibilidad

- Altura mínima de botones táctiles: 44px
- Altura mínima de inputs: 44px
- Contraste WCAG AA para texto normal
- Focus visible con ring de 2px
