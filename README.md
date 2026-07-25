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
frontend/Dockerfile.prod       Build prod frontend (vite build + nginx)
frontend/nginx.conf            Config nginx (SPA + reverse proxy /api)
docker-compose.yml              Ambiente locale/staging (dev, hot-reload)
docker-compose.prod.yml         Ambiente di produzione
.env.production.example         Template variabili d'ambiente prod
.github/workflows/ci.yml        Build/check su push e PR
.github/workflows/deploy-prod.yml  Deploy automatico su push a main
```

## Deployment

Ci sono due ambienti:

- **staging**: locale, sul proprio computer, con Docker Compose come oggi
  (`docker compose up --build`), tipicamente allineato al branch `develop`.
  Nessuna automazione: è manuale.
- **prod**: gira su questo stesso server (raggiungibile in tailnet via
  Tailscale Serve) e si aggiorna **automaticamente** a ogni push/merge su
  `main`, tramite un runner self-hosted di GitHub Actions.

### Staging (locale)

Uguale al flusso di sviluppo descritto sopra in "Avvio rapido", con `.env`
basato su `.env.example`.

### Produzione

1. Requisiti sul server (setup una tantum, manuale):
   - Tailscale installato e autenticato (`sudo tailscale up`), MagicDNS e
     "HTTPS Certificates" attivi sul tailnet.
   - `sudo tailscale serve --bg --https=443 http://127.0.0.1:8080` per
     esporre il frontend in tailnet come
     `https://<hostname>.<tailnet>.ts.net` (persiste automaticamente tra i
     riavvii, nessun servizio aggiuntivo da creare).
   - Un runner GitHub Actions self-hosted registrato su questo repo con
     etichetta `gestionale-prod` (Settings → Actions → Runners), installato
     come servizio systemd (`./svc.sh install && ./svc.sh start`), con il
     suo utente nel gruppo `docker`.
   - File `/opt/gestionale-ore/.env.production` creato a mano sul server
     (basato su `.env.production.example`, con segreti reali: password
     Postgres, `JWT_SECRET` forte, credenziali Google OAuth,
     `FRONTEND_URL`/`GOOGLE_CALLBACK_URL` con l'hostname Tailscale). Non
     viene mai letto dal repository né committato.
   - Redirect URI OAuth registrato su Google Cloud Console:
     `https://<hostname>.<tailnet>.ts.net/api/auth/google/callback`.

2. Deploy: automatico a ogni push su `main` (workflow
   `.github/workflows/deploy-prod.yml`), che esegue sul runner self-hosted:

   ```bash
   docker compose --env-file /opt/gestionale-ore/.env.production \
     -f docker-compose.prod.yml up -d --build
   ```

3. Deploy manuale (fallback), dalla directory del repo sul server: lo
   stesso comando del punto 2.

## Accesso consentito (whitelist)

Di default chiunque abbia un account Google può entrare. L'elenco di chi può
accedere si gestisce in due modi, che convivono:

- dal **Backoffice**, sezione *Accessi consentiti* (tabella `allowed_emails`);
- da `.env`, utile al primo avvio quando non esiste ancora un admin:

  ```
  ALLOWED_EMAILS=mario@azienda.it,@azienda.it
  ```

Entrambi accettano email singole o interi domini (`@azienda.it`). Chi non è in
elenco viene respinto **prima** che l'utente venga creato a database, e vede un
messaggio dedicato nella pagina di login. Elenco vuoto ovunque = nessuna
restrizione.

## Invio del mese

Il dipendente chiude il mese con **Invia il mese**: da quel momento l'admin può
scaricarne il PDF dal backoffice. Finché il mese non è inviato il download
risponde `409` e il pulsante resta disabilitato. Il dipendente può riaprire il
mese per correggerlo.

## Calendario e ore

- I giorni lavorativi seguono il calendario italiano: lunedì–venerdì, escluse le
  festività nazionali (comprese Pasqua e Lunedì dell'Angelo, calcolati per anno).
- Alla **prima** registrazione di ore in un mese, lo stesso orario viene
  replicato su tutti gli altri giorni lavorativi ancora vuoti. L'operazione è
  annullabile dal banner che compare subito dopo.
- Il PDF riporta **tutti** i giorni del mese: i giorni non registrati sono
  qualificati come *Riposo*, *Festività* o *Non registrato*.
- Il tema chiaro/scuro si cambia dalla sidebar e segue le preferenze di sistema
  al primo accesso.

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
| POST | `/entries/bulk` | Crea/aggiorna più giorni in transazione |
| DELETE | `/entries/bulk` | Annulla una precompilazione |
| PUT/DELETE | `/entries/:id` | Modifica/elimina |
| GET | `/summary?month=YYYY-MM` | Riepilogo mensile |
| GET | `/export/pdf?month=YYYY-MM` | PDF del mese |
| GET | `/summary/year?year=YYYY` | Recap annuale per mese |
| GET/POST/DELETE | `/entries/submission` | Stato, invio e riapertura del mese |
| GET | `/admin/users` | (admin) elenco utenti |
| DELETE | `/admin/users/:id` | (admin) elimina utente e sue ore |
| GET/POST/DELETE | `/admin/allowed-emails` | (admin) whitelist accessi |
| GET | `/admin/submissions?month=YYYY-MM` | (admin) chi ha inviato il mese |
| GET | `/admin/users/:id/summary?month=YYYY-MM` | (admin) dettaglio utente |
