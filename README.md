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
   Create a `.env` file in the `backend` directory with the following variables:
   ```
   CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   CHAPA_SECRET_KEY=your_chapa_secret_key
   CHAPA_PUBLIC_KEY=your_chapa_public_key
   CHAPA_WEBHOOK_SECRET=your_webhook_secret
   TICKETMASTER_API_KEY=your_ticketmaster_api_key
   EVENTBRITE_API_KEY=your_eventbrite_api_key
   SKIDDLE_API_KEY=your_skiddle_api_key
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
   Create a `.env` file in the `frontend` directory with the following variable:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   ```

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

### Backend
- `CLERK_PUBLISHABLE_KEY`: Clerk publishable key for authentication
- `CLERK_SECRET_KEY`: Clerk secret key for API requests
- `CHAPA_SECRET_KEY`: Chapa payment gateway secret key
- `CHAPA_PUBLIC_KEY`: Chapa payment gateway public key
- `CHAPA_WEBHOOK_SECRET`: Secret for verifying Chapa webhook requests
- `TICKETMASTER_API_KEY`: API key for Ticketmaster events
- `EVENTBRITE_API_KEY`: API key for Eventbrite events
- `SKIDDLE_API_KEY`: API key for Skiddle events

### Frontend
- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk publishable key for frontend authentication

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
