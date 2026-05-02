# Company Brain — Web

Frontend Next.js 15 del producto Company Brain. Listado para deploy en Vercel.

**Estética**: Anthropic / Linear / Vercel — minimal, tipografía Geist, neutrals + acento terracotta.
**Cliente demo**: BIND (banco argentino, primer piloto).
**Deploy target**: demo de YC W26.

---

## Estructura

```
app/
├── layout.tsx                # Root layout con fuentes Geist
├── globals.css               # Paleta + utilities
├── page.tsx                  # Landing pública
├── ask/
│   └── page.tsx              # Web app del empleado (Trojan Horse) — el momento WOW
├── admin/
│   ├── layout.tsx            # Sidebar + nav (compartido con /brain)
│   ├── page.tsx              # Overview del admin (KPIs)
│   ├── interviews/page.tsx   # Lista de entrevistas
│   ├── integrations/page.tsx # Conectores (channels / sources / identity)
│   ├── upload/page.tsx       # Subir org chart CSV
│   └── settings/page.tsx     # Stub
└── brain/
    ├── layout.tsx            # Reusa AdminLayout
    ├── page.tsx              # Redirect → /brain/people
    ├── people/page.tsx       # Tabla de empleados + drawer
    ├── tools/page.tsx        # Stub
    ├── processes/page.tsx    # Stub
    ├── glossary/page.tsx     # Glosario interno
    └── relationships/page.tsx # Stub (graph viz V1.5)

components/
├── ui/                       # Primitivos (shadcn-style)
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   └── logo.tsx
├── answer-card.tsx           # ★ La pieza estrella del demo
├── thinking-trace.tsx        # Extended thinking colapsable
├── citations.tsx             # Citations (admin only)
├── person-card.tsx           # Card de persona con contacto
├── composer.tsx              # Input multi-line del chat
├── user-selector.tsx         # Dropdown fake auth
├── locale-toggle.tsx         # Toggle ES/EN
├── site-header.tsx           # Header de la landing
├── hero-chat-mock.tsx        # Animación del hero
├── before-after-animation.tsx # Animación problema vs solución
└── integration-card.tsx      # Card de conector

lib/
├── types.ts                  # Tipos del dominio (Person, Tool, QAAnswer, etc.)
├── mock-data.ts              # Dataset sintético + 4 casos demo
├── i18n.ts                   # Strings ES/EN
└── utils.ts                  # cn() helper
```

---

## Casos demo precargados

`/ask` responde 4 queries de manera fully canned (sin backend):

1. **Acceso a sistemas**: *"Necesito acceso a Salesforce, ¿a quién le pido?"* → derive a Ana López (Gerente de Créditos) + Tomás Ledesma (Sysadmin).
2. **Routing**: *"Cliente enojado por rechazo, ¿qué hago?"* → Roberto Pascual con script + advertencia BCRA de no mencionar score.
3. **Conflicto multi-source**: *"¿Cuánto tarda un alta de usuario?"* → SLA oficial vs realidad informal (Tomás).
4. **Knowledge gap honesto** (★ EL WOW DE LA DEMO): *"¿Política de licencia por paternidad?"* → "no lo tengo, pero Valeria de RRHH probablemente sepa."

El matcher de queries está en `lib/mock-data.ts → matchDemoQuery()`. Cualquier query que no matchee cae al gap genérico.

---

## Cómo correr local

```bash
cd company-brain-web
npm install --legacy-peer-deps   # legacy-peer-deps por la mezcla React 19 + Radix
npm run dev
# → http://localhost:3000
```

URLs:
- `/` — landing
- `/ask` — web app del empleado (sirve para la demo)
- `/admin` — overview del admin
- `/admin/integrations` — los 17 conectores
- `/admin/interviews` — lista de entrevistas
- `/admin/upload` — drag&drop del org chart
- `/brain/people` — tabla de empleados con drawer
- `/brain/glossary` — glosario interno

---

## Deploy a Vercel

```bash
npm i -g vercel
vercel --prod
```

Variables de entorno (cuando se conecte al backend real):
```
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
```

Domain custom: `companybrain.vercel.app` para V1, `thecompanybrain.ai` cuando esté el dominio.

**Multi-tenant**: la arquitectura está pensada para subdomain (ej `bind.thecompanybrain.ai`). En V1 con `vercel.app` el tenant queda hardcoded a BIND vía `lib/mock-data.ts → ORGANIZATION`.

---

## Estado de cada pieza

| Pieza | Estado | Notas |
|---|---|---|
| Landing `/` | ✅ Lista | Hero animado, problema antes/después, integraciones, CTA |
| `/ask` web app del empleado | ✅ Lista | 4 casos demo funcionando, multi-turn, ES/EN |
| `/admin` overview | ✅ Lista | KPIs + entrevistas pendientes + recent queries |
| `/admin/integrations` | ✅ Lista | 17 conectores (channels / sources / identity) |
| `/admin/interviews` | ✅ Lista | Lista de 12 entrevistas con status |
| `/admin/upload` | ✅ Lista | Drag&drop con preview + scheduling |
| `/brain/people` | ✅ Lista | Tabla + drawer detalle |
| `/brain/glossary` | ✅ Lista | 6 términos de BIND |
| `/brain/tools` `/brain/processes` `/brain/relationships` | ⚠️ Stub | V1.5 — alcanza con header + placeholder |
| Auth real | ❌ V1.5 | V1 = fake dropdown con 12 empleados |
| Backend real | ❌ V1.5 | V1 = mocks pre-grabados, demo robusto |
| Dark mode | ❌ V2 | Estructura ready, no testeado |
| Mobile del admin | ❌ V1.5 | Desktop-only por ahora |

---

## Para el screencast (60 segundos)

Orden recomendado:

1. (5s) Cámara — Tomás dice quién es
2. (10s) Pantalla — el problema en Slack: animación antes/después en `/`
3. (30s) Demo en vivo en `/ask`:
   - Pregunta 1: "Necesito acceso a Salesforce" → AnswerCard con Ana López
   - Pregunta 4 (★ WOW): "Política de licencia por paternidad" → gap card honesta
4. (10s) Click rápido al `/admin/integrations` para mostrar Slack/Google Chat/etc.
5. (5s) Cierre + URL

---

## Decisiones técnicas tomadas

- **Next.js 15.1** con App Router (RSC + Suspense + actions)
- **Tailwind 3** (Tailwind 4 todavía está en alpha en mayo 2026)
- **Geist** para fuentes (Vercel, gratis)
- **Framer Motion** para animaciones críticas (hero, AnswerCard, thinking trace)
- **Lucide** para iconografía (single source)
- **shadcn-style** components custom (no instalación de la CLI — los componentes están inline en `components/ui/`)
- **Sin database**: todo mock en V1 para que la demo nunca falle. Backend real se conecta en V1.5
- **Sin auth**: dropdown fake con localStorage para "logueado como X"
- **i18n simple custom** (sin next-intl) — `lib/i18n.ts` con dict + función `t()`

---

## Próximos pasos post-YC

1. Conectar al backend FastAPI (mismo schema en `lib/types.ts` mirroea `models/schemas.py`)
2. Implementar SSE para streaming del extended thinking
3. Auth real con Clerk o Supabase
4. Dark mode (estructura ya está)
5. Mobile del admin
6. `/brain/relationships` con react-flow
7. Subdomain real (DNS wildcard de `*.thecompanybrain.ai`)
8. Conectores de verdad: empezar por Google Chat (cliente prioritario es BIND)
9. Locale toggle: agregar más idiomas (PT-BR para Brasil, etc.)

---

*Generado el 2 mayo 2026 · Para el demo de YC del 4 mayo · Cliente demo: BIND*
