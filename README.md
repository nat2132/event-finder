# Event Finder

A full-stack web application for discovering and managing events from multiple sources including Ticketmaster, Eventbrite, and Skiddle.

## Features

- Browse events from multiple sources in one place
- User authentication and authorization
- Event search and filtering
- Event details and ticketing
- Responsive design for all devices

## Prerequisites

- Node.js (v18 or higher)
- Python (3.8 or higher)
- pip (Python package manager)
- Git

## Getting Started

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/nat2132/event-finder.git
   cd event-finder/backend
   ```

2. **Create and activate a virtual environment**
   ```bash
   # On Windows
   python -m venv venv
   .\venv\Scripts\activate
   
   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   Create a `.env` file in the backend project directory (`backend/backend/`)
   with the following variables (all optional for local development unless
   noted — the defaults match the local setup):
   ```
   SECRET_KEY=your_django_secret_key
   DEBUG=True
   # Local MySQL dev database (defaults shown):
   DB_NAME=event_finder
   DB_USER=root
   DB_PASSWORD=your_local_mysql_password
   DB_HOST=localhost
   DB_PORT=3306
   # Authentication and payments (user-provided):
   CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   CLERK_JWKS_URL=your_clerk_jwks_url
   CHAPA_SECRET_KEY=your_chapa_secret_key
   CHAPA_PUBLIC_KEY=your_chapa_public_key
   CHAPA_WEBHOOK_SECRET=your_webhook_secret
   TM_API_KEY=your_ticketmaster_api_key
   ```

5. **Run database migrations**
   ```bash
   python manage.py migrate
   ```

6. **Start the backend server**
   ```bash
   python manage.py runserver
   ```
   The backend will be available at `http://127.0.0.1:8000/`

### Frontend Setup

1. **Navigate to the frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Copy `.env.example` to `.env` and fill in the values:
   ```bash
   cp .env.example .env
   ```
   At minimum you need `VITE_CLERK_PUBLISHABLE_KEY`; the third-party keys
   (`VITE_TICKETMASTER_API_KEY`, `VITE_SKIDDLE_API_KEY`) are user-provided.

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173/`

## Available Scripts

### Backend
- `python manage.py runserver` - Start the development server
- `python manage.py migrate` - Apply database migrations
- `python manage.py createsuperuser` - Create a superuser for the admin panel

### Frontend
- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint

## Deployment

### Backend Deployment
1. Set up a production-ready WSGI server (e.g., Gunicorn)
2. Configure a production database (PostgreSQL recommended)
3. Set up environment variables in your production environment
4. Use a production-grade web server (Nginx, Apache) as a reverse proxy

### Frontend Deployment
1. Build the production version:
   ```bash
   npm run build
   ```
2. Deploy the contents of the `dist` directory to your preferred static file hosting service (Vercel, Netlify, etc.)

## Environment Variables

Configuration is read from the environment (dotenv is supported: backend loads `<backend-project-root>/.env`).

### Backend (`backend/backend/.env`)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SECRET_KEY` | Yes in production (must be set when `DEBUG` is off) | Development-only fallback while `DEBUG=True` | Django secret key. Generate one with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`. |
| `DEBUG` | No | `False` | Set to `true`/`1` only for local development. |
| `ALLOWED_HOSTS` | No | *(empty)* | Comma-separated list, e.g. `api.example.com,.example.herokuapp.com`. Localhost variants are automatically trusted while `DEBUG=True`. |
| `DATABASE_URL` | Recommended in production | *(unset)* | Full database URL for PostgreSQL, e.g. `postgresql://user:password@host:5432/event_finder`. When set, it takes precedence over `DB_*` variables. |
| `DB_ENGINE` | No | `django.db.backends.mysql` | Database engine used when `DATABASE_URL` is not set. |
| `DB_NAME` | No | `event_finder` | Database name. |
| `DB_USER` | No | `root` | Database user. |
| `DB_PASSWORD` | No | *(empty)* | Database password. Set for local MySQL; never commit a real password. |
| `DB_HOST` | No | `localhost` | Database host. |
| `DB_PORT` | No | `3306` | Database port. |
| `CORS_ALLOWED_ORIGINS` | Web / native | *(empty)* | Comma-separated origin allow-list, e.g. `https://app.example.com,https://app2.example.com`. While `DEBUG=True` the local Vite dev server (ports 5173) is allowed automatically. |
| `CORS_ALLOW_ALL_ORIGINS` | No | *(off)* | Set to `*` only in development to allow every origin (otherwise unsafe). |
| `CSRF_TRUSTED_ORIGINS` | No | *(empty)* | Comma-separated origins for CSRF, e.g. `https://app.example.com`. Defaults to the local Vite dev server while `DEBUG=True`. |
| `CLERK_PUBLISHABLE_KEY` | Yes (auth) | *(unset)* | Clerk publishable key. |
| `CLERK_SECRET_KEY` | Yes (auth) | *(unset)* | Clerk secret key. |
| `CLERK_JWKS_URL` | Recommended | legacy development Clerk JWKS URL | Full JWKS URL of your Clerk instance, e.g. `https://<your-instance>.clerk.accounts.dev/.well-known/jwks.json`. **User-provided.** |
| `TM_API_KEY` | Yes (external events proxy) | placeholder string | Ticketmaster Discovery API key used by `/api/external/ticketmaster/`. **User-provided.** |
| `PUBLIC_API_URL` | No | *(unset)* | Public base URL of the API, used to build absolute media URLs when no request context is available (e.g. `https://api.example.com`). |
| `CHAPA_PUBLIC_KEY` | Yes (payments) | *(unset)* | Chapa payment gateway public key. **User-provided.** |
| `CHAPA_WEBHOOK_SECRET` | Yes (payments) | *(unset)* | Secret for verifying Chapa webhook requests. **User-provided.** |

> **Note:** Clerk webhooks and Chapa payment integration require the deployer
> to provide their own Clerk instance and Chapa keys — they are not bundled.
> `EVENTBRITE_API_KEY` and `SKIDDLE_API_KEY` are legacy names; no backend code
> currently reads them.

### Frontend (`frontend/.env` — see `frontend/.env.example`)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Only when the API is on a different origin | *(empty)* | Base URL of the backend API, e.g. `https://api.example.com`. Empty keeps `/api` and `/media` relative: the Vite dev proxy forwards them to `http://127.0.0.1:8000` in development. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes (auth) | *(unset)* | Clerk publishable key for the frontend. **User-provided.** |
| `VITE_TICKETMASTER_API_KEY` | Yes (external events) | *(unset)* | Ticketmaster key used by client-side external-events search. **User-provided.** |
| `VITE_SKIDDLE_API_KEY` | Yes (external events) | *(unset)* | Skiddle key used by client-side external-events search. **User-provided.** |

> Never commit real values. Copy `.env.example` to `.env` and fill in values
> locally or in your hosting provider's secret management.

### Database options

- **PostgreSQL (recommended for production):** set `DATABASE_URL` — e.g.
  `postgresql://user:password@host:5432/event_finder` — and the Django backend
  uses the `django.db.backends.postgresql` engine via `dj_database_url`
  (driver: `psycopg2-binary`).
- **MySQL (default fallback):** when `DATABASE_URL` is not set, the DB_* env
  vars from the table above configure the `django.db.backends.mysql` engine,
  with defaults matching the original local developer setup.
- **Media persistence:** user-uploaded media is stored in `MEDIA_ROOT` on the
  server's local (often ephemeral) disk on free hosting tiers; uploads are lost
  on restarts/redeploys. Switch to object storage (e.g. S3) for persistence.

### Static files in production

Run `python manage.py collectstatic` during deploy. With `DEBUG=False`,
whitenoise (added to middleware) serves compressed statics from
`STATIC_ROOT`/`staticfiles` under gunicorn. User-uploaded `/media/` files are
also served by Django in this setup (note the media-ephemerality caveat above).

## Contributing

1. Fork the repository
2. Create a new branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Django](https://www.djangoproject.com/)
- [React](https://reactjs.org/)
- [Clerk](https://clerk.com/)
- [Chapa](https://chapa.co/)
- [Tailwind CSS](https://tailwindcss.com/)
