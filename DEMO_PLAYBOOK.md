# Company Brain — Demo Playbook

Cómo demostrar el sistema. Pensado para YC interview + sales pitch a BIND.

## URLs

| | |
|---|---|
| **Producción** | https://thecompanybrain.xyz |
| Vercel default | https://the-company-brain.vercel.app |
| Backend (API) | https://company-brain-backend.onrender.com |
| Repo | https://github.com/DanteDia/TheCompanyBrain |
| Supabase | proyecto `mgiruiewkezckpofrhsx` (sa-east-1) |

## Modos de la demo

| URL flag | Comportamiento |
|---|---|
| `/ask` | Auto: backend real con fallback a mock si el backend no responde. Lo más resiliente para una entrevista YC en vivo. |
| `/ask?live=1` | Fuerza backend real. Sin fallback. Si el backend está down, error visible. Útil para mostrar el LLM real en acción. |
| `/ask?demo=1` | Fuerza mock. La demo va a velocidad de UI (~2s). Útil para grabar el video sin esperar a Opus. |

---

## Demo A — Q&A Trojan Horse (60 segundos)

**Lo que muestra:** una empresa donde 3 empleados ya fueron entrevistados; un empleado nuevo le pregunta al Brain.

1. Abrir https://thecompanybrain.xyz/ask
2. Click en *"Necesito acceso a Salesforce, ¿a quién le pido?"*
3. **Lo que ven:** thinking trace + respuesta con Ana Lopez como contacto, procedimiento JIRA + manager-CC, y el SLA real-vs-oficial citado de la entrevista de Tomás
4. Click en la siguiente sugerida: *"¿Cuál es la política de licencias por paternidad?"*
5. **Lo que ven:** `insufficient_information=true` honestamente + redirección a Valeria Ríos (HR) basada en su área. **Sin alucinación.** Este es el WOW.

## Demo B — Live Interview (90 segundos, máximo WOW)

**Lo que muestra:** el Brain construyéndose en vivo. El espectador ve el Person enriquecido aparecer.

1. Abrir https://thecompanybrain.xyz/admin (password `1234`)
2. Ir a **Interviews** en la sidebar
3. Click "Entrevista en vivo" en cualquier empleado **pending** (ej: Diego Herrera)
4. Se abre una pestaña con el agente Retell — dale permiso al mic
5. **El agente arranca:** *"Hola Diego, soy Brain — gracias por darme estos minutos…"*
6. Hablás 30-60 segundos. Respondés 2-3 preguntas del agente.
7. Cerrás la pestaña.
8. **En 30-60 segundos**, volvés al admin → **Brain → People** → la person que entrevistaste tiene `last_interviewed_at` actualizado, `current_projects` populado, `expertise_areas` extraído, e InformalRules nuevas si mencionaste alguna.

Este es el **Caso 5 del spec V2** — el sistema construyéndose en vivo durante la demo.

## Demo C — Onboarding completo de una empresa nueva (3-4 minutos)

**Lo que muestra:** una empresa entera entra al sistema desde cero.

1. Abrir https://thecompanybrain.xyz/admin/upload
2. Cambiar el `Organization id` a algo único, ej: `acme_test`
3. Subir un CSV con la siguiente estructura:
   ```
   id,name,email,role,area,manager_id,phone
   ceo_01,Ana CEO,ana@acme.com,CEO,Direccion,,+5491100000001
   cto_01,Bruno CTO,bruno@acme.com,CTO,Tecnologia,ceo_01,+5491100000002
   ...
   ```
4. **Lo que pasa:** el backend procesa el CSV → seedea 12 People entities en el Skills File → muestra preview con avatares
5. Click **"Iniciar agendamiento"**
6. **Lo que pasa:** el backend llama a Google Calendar API con domain-wide delegation → crea N invites con Meet links auto-generados → distribuye en slots de 15 min M-F 9-18
7. La pantalla muestra los Meet links generados
8. *(En la realidad, los empleados reciben el invite en su Gmail y, al unirse al Meet, son entrevistados por el agente Retell. Para el demo de YC, hacemos esto offline con datos pre-cargados.)*

⚠️ **Lo que NO está implementado todavía** (V1.5/V2):
- Verificar `freebusy` de cada empleado antes de agendar (hoy distribuye cronológico)
- Coordinar via Google Chat para "encontrar el mejor horario"
- Reintentar slots si el empleado declina
- Personalizar las 13 preguntas según rol (hoy son las mismas para CEO y junior)

## Demo D — Brain Explorer (45 segundos)

**Lo que muestra:** el grafo construido tiene profundidad real.

1. Abrir https://thecompanybrain.xyz/brain/people — tabla con todas las personas, filtros por área
2. Tab **Reglas no escritas** — *"el Comité de Créditos del jueves nunca arranca puntual"*, *"el SLA real de altas es 2-3 días, no 24-48hs"*, etc. Cada una con citation textual de la entrevista. **Esto es el moat: ningún CMS/Confluence captura esto.**
3. Tab **Glosario** — siglas internas (PyME M, ALCO, BCS, RA…) capturadas automáticamente

## Variables de entorno

Para correr local, copiá `.env.example` → `.env`. Para Render/Vercel ya están configurados.

Los secrets críticos están seteados en:
- **Render** (backend env vars): ANTHROPIC_API_KEY, OPENROUTER_API_KEY, SUPABASE_URL/KEYS, RETELL_API_KEY, RETELL_AGENT_ID, TWILIO_*, GCP_SERVICE_ACCOUNT_JSON
- **Vercel** (frontend env vars): NEXT_PUBLIC_API_URL=https://company-brain-backend.onrender.com

## Eval gate

Antes de cualquier deploy:
```bash
cd backend
python -m eval.run_eval --skills-file path/to/dump.json
```
8 casos. Si fallan, no deploy.

## Si algo se rompe durante la demo

| Falla | Plan B |
|---|---|
| `/ask` con `?live=1` no responde | Cambiar URL a `/ask?demo=1` — mock-driven, siempre andá |
| `/admin` no carga | El landing en `/` está 100% en mock, siempre andá |
| Live interview Web Call falla | Mostrar transcript pre-grabado de Ana / Tomás / Roberto en `/admin/interviews → Ver transcript` |
| Render dormido (free plan a veces se duerme) | Curl a `/health` para despertarlo, esperar 30s |

## Costo por demo

~$0.70 USD totales:
- 1 entrevista live (Retell + Sonnet): ~$0.30
- Procesamiento del transcript (Opus): ~$0.30
- 5 queries Q&A (Opus + extended thinking): ~$0.10
