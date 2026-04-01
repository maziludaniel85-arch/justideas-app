# JustIdeas — Platformă de Înregistrare Firme (România)

## Overview

REST API backend for JustIdeas — a Romanian company registration platform. Built with Node.js/Express, TypeScript, Drizzle ORM, and PostgreSQL (hosted on Railway).

## Architecture

### Monorepo (pnpm workspaces)

```
lib/
  api-spec/     — OpenAPI 3.1 YAML spec + Orval codegen config
  api-zod/      — Generated Zod schemas & React Query hooks (from codegen)
  db/           — Drizzle ORM schema + DB connection
scripts/        — Utility scripts (CAEN seed, etc.)
artifacts/
  api-server/   — Express API server (main artifact)
```

### Database: Railway PostgreSQL
- Connection via `EXTERNAL_DATABASE_URL` env var (shared)
- Falls back to `DATABASE_URL` (Replit managed)
- SSL enabled (`rejectUnauthorized: false`)

### Authentication
- JWT tokens (7-day expiry), signed with `JWT_SECRET` env var
- bcryptjs for password hashing (12 rounds)
- `Authorization: Bearer <token>` header required for protected routes

## API Endpoints (all under `/api`)

### Auth (`/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/inregistrare` | Register new user |
| POST | `/auth/autentificare` | Login |
| GET | `/auth/profil` | Get profile (auth required) |
| PATCH | `/auth/profil` | Update profile (auth required) |

### Dosare — Company Registration Files (`/dosare`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dosare` | List user's files |
| POST | `/dosare` | Create new file |
| GET | `/dosare/statistici` | Dashboard statistics |
| GET | `/dosare/:id` | Get file details (includes asociati + plati) |
| PATCH | `/dosare/:id` | Update file |
| DELETE | `/dosare/:id` | Delete file |
| PATCH | `/dosare/:id/pas` | Update wizard step (1-6) |
| POST | `/dosare/:id/trimite` | Submit file for processing |

### Asociați — Shareholders (`/dosare/:id/asociati`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dosare/:id/asociati` | List shareholders |
| POST | `/dosare/:id/asociati` | Add shareholder |
| PATCH | `/dosare/:id/asociati/:asociatId` | Update shareholder |
| DELETE | `/dosare/:id/asociati/:asociatId` | Remove shareholder |

### Coduri CAEN (`/coduri-caen`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/coduri-caen` | List/search CAEN codes (paginated) |
| GET | `/coduri-caen/:cod` | Get specific CAEN code |

### Plăți — Payments (`/plati`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/plati` | List user's payments |
| POST | `/plati` | Create payment |
| GET | `/plati/:id` | Get payment details |
| PATCH | `/plati/:id` | Update payment status |

## Database Schema (Railway PostgreSQL)

### `utilizatori` — Users
- id, email (unique), parola (bcrypt hash), nume, prenume, telefon
- rol: `client` | `admin`

### `dosare` — Company Registration Files
- id, utilizator_id (FK), denumire_firma, forma_juridica
- Wizard fields: judet, localitate, adresa_sediu, cod_postal, cod_caen_principal, descriere_activitate
- Capital: capital_social, numar_parti, valoare_parte
- Status: `ciorna` → `in_asteptare` → `in_procesare` → `aprobat` | `respins`
- pas_curent: 1–6 (wizard steps)
- cui, numar_inregistrare (set after approval)

### `asociati` — Shareholders
- id, dosar_id (FK), nume_complet, cnp, tip_act_identitate
- nationalitate, adresa, numar_parti, procent_detinere, aport_capital
- este_persoana_juridica, cui_persoana_juridica

### `coduri_caen` — CAEN Reference Data
- cod (PK), denumire, sectiune, diviziune, grupa, clasa
- Pre-seeded with 264 codes (`pnpm --filter @workspace/scripts run seed-caen`)

### `plati` — Payments
- id, dosar_id (FK), utilizator_id (FK), suma, valuta (RON default)
- status: `in_asteptare` | `platit` | `esuat` | `rambursat`
- metoda_plata: `card` | `transfer_bancar` | `numerar`
- referinta_plata, descriere, data_plata

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXTERNAL_DATABASE_URL` | Railway PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `PORT` | Server port (default 8080) |

## Development Commands

```bash
# Build lib packages (needed for TypeScript project references)
pnpm --filter @workspace/db exec tsc -p tsconfig.json
pnpm --filter @workspace/api-zod exec tsc -p tsconfig.json

# Push schema to Railway
EXTERNAL_DATABASE_URL="..." pnpm --filter @workspace/db run push-force

# Seed CAEN codes
EXTERNAL_DATABASE_URL="..." pnpm --filter @workspace/scripts run seed-caen

# Typecheck
pnpm --filter @workspace/api-server run typecheck

# Regenerate Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## Key Design Decisions

- All responses use Romanian field names (`eroare` not `error`, `creatLa` not `createdAt`)
- Admins see all data; regular users see only their own dosare/plati
- `numeric` DB columns converted to `Number()` at API boundary
- bcrypt hash rounds: 12 (production-suitable)
- JWT expiry: 7 days
