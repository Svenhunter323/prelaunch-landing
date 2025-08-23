# Zoggy Pre-Launch Backend API

A fully functional backend API for the Zoggy Pre-Launch platform with user email verification, waitlist system, referral tracking, chest opening (credits system), Telegram verification, fake wins feed, and admin dashboard.

## Features

- **Email Verification System** - Users must verify their email before accessing the dashboard
- **Waitlist Management** - Users join a waitlist with referral tracking
- **Chest Opening System** - Daily chest opening with credit rewards
- **Telegram Integration** - Users must join Telegram channel to open chests
- **Fake Wins Feed** - Simulated wins to create excitement
- **Admin Dashboard** - User management and data export
- **Anti-fraud Protection** - IP/device limitations and duplicate prevention

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

## API Endpoints

### Public Routes

- **POST /api/waitlist** - User signup with email verification
- **GET /api/verify-email** - Email verification endpoint
- **POST /api/resend-verification** - Resend verification email
- **GET /api/dashboard** - User dashboard (requires email verification)
- **POST /api/open-chest** - Open daily chest for credits
- **GET /api/last-wins** - Get fake wins feed

### Telegram Routes

- **GET /api/telegram/deeplink** - Get Telegram verification link
- **POST /api/telegram/webhook/:secret** - Telegram webhook

### Admin Routes

- **POST /api/admin/login** - Admin authentication
- **GET /api/admin/users** - List all users
- **GET /api/admin/export/codes** - Export user data as CSV

## Email Configuration

The system supports multiple email providers. For Gmail:

1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `EMAIL_PASSWORD`

Example Gmail configuration:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM=noreply@zoggy.com
```

## Database Models

### User Model
- Email verification fields
- Referral system
- Credits/chest tracking
- Telegram integration
- Anti-fraud data

### ChestOpen Model
- Tracks chest opening history
- Reward amounts and timing

### FakeWin Model
- Simulated wins for the feed
- Rotates every 45 seconds

## Security Features

- JWT-based authentication
- Email verification requirement
- Rate limiting on signup
- IP-based signup limits
- Device tracking
- Admin role protection

## Development

The server runs on port 8080 by default. MongoDB connection and all sensitive data should be configured via environment variables.

For testing, you can use the included Postman collection or test the endpoints directly.

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure all environment variables
3. Set up MongoDB database
4. Configure email service
5. Set up Telegram bot and webhook
6. Deploy and set `PUBLIC_BASE_URL`

## Monitoring

The application includes:
- Health check endpoint: `GET /health`
- Console logging for debugging
- Error handling middleware
- Request context capture