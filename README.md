# Gestionale Ore

Applicazione per registrare le ore lavorate giorno per giorno, con riepiloghi mensili
(giorni lavorati, totale ore, giorni di ferie), login con Google, export PDF e
backoffice per l'amministratore.

## Stack

- **Frontend**: React + Vite + React Router
- **Backend**: Node.js + Express + Passport (Google OAuth) + JWT
- **Database**: PostgreSQL
- **Orchestrazione**: Docker Compose (frontend, backend, db)

## Avvio rapido

1. Copia le variabili d'ambiente e configurale:

   ```bash
   cp .env.example .env
   ```

   Imposta almeno `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e
   `ADMIN_EMAILS` (le email che diventano admin al primo login).

2. Crea le credenziali OAuth su
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Tipo: *Web application*
   - Authorized redirect URI: `http://localhost:4000/auth/google/callback`

3. Avvia tutto:

   ```bash
   docker compose up --build
   ```

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000
   - Le migrazioni del DB vengono eseguite automaticamente all'avvio del backend.

4. (Opzionale) Inserisci dati di test:

   ```bash
   docker compose exec backend npm run seed
   ```

## Login di sviluppo (senza Google)

Per provare l'app in locale senza configurare Google OAuth, imposta in `.env`:

```
DEV_LOGIN=true
```

Nella pagina di login comparirà un riquadro **"Login di sviluppo"**: inserisci una
email qualsiasi e scegli se entrare come admin. Il flag è ignorato quando
`NODE_ENV=production`, quindi non è utilizzabile in produzione.

## Struttura

```
backend/    API Express, auth, migrazioni, generazione PDF
frontend/   App React (login, vista mese, backoffice)
docker-compose.yml
```

## Ruoli

- **user**: vede e modifica solo le proprie ore.
- **admin**: in più accede al **Backoffice** (`/backoffice`) per vedere tutti gli
  utenti, i loro riepiloghi ed esportare il PDF di ciascuno. Un utente diventa admin
  se la sua email è in `ADMIN_EMAILS`.

## API principali

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/auth/google` | Avvia login Google |
| GET | `/auth/me` | Utente corrente |
| POST | `/auth/logout` | Logout |
| GET | `/entries?month=YYYY-MM` | Registrazioni del mese |
| POST | `/entries` | Crea/aggiorna registrazione del giorno |
| PUT/DELETE | `/entries/:id` | Modifica/elimina |
| GET | `/summary?month=YYYY-MM` | Riepilogo mensile |
| GET | `/export/pdf?month=YYYY-MM` | PDF del mese |
| GET | `/admin/users` | (admin) elenco utenti |
| GET | `/admin/users/:id/summary?month=YYYY-MM` | (admin) dettaglio utente |
