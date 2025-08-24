# Zoggy Pre-Launch Backend

A production-ready TypeScript backend for the Zoggy Pre-Launch platform featuring waitlist management, daily chest opening, referral tracking, Telegram verification, and comprehensive admin tools.

## 🚀 Features

- **Waitlist Management**: Email-based signup with referral tracking
- **Daily Chest System**: 24-hour cooldown with weighted reward distribution
- **Referral System**: Advanced fraud detection and eligibility validation
- **Telegram Integration**: Channel membership verification via bot
- **Fake Wins Feed**: Realistic win simulation with timing constraints
- **Leaderboard**: Top 10 with anti-fraud measures
- **Admin Dashboard**: User management, exports, and fraud monitoring
- **Production Ready**: Comprehensive logging, error handling, and testing

## 🛠 Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: MongoDB with Mongoose ODM
- **Cache/Jobs**: Redis with BullMQ for background processing
- **Authentication**: JWT with role-based access control
- **Validation**: Zod schemas for type-safe validation
- **Security**: Helmet, CORS, rate limiting, input sanitization
- **Logging**: Pino with pretty printing in development
- **Documentation**: OpenAPI 3.0 with Swagger UI
- **Testing**: Jest with Supertest for integration tests
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Redis (local or cloud)
- Mailchimp account (optional)
- Telegram Bot (optional)

## 🚀 Quick Start

### 1. Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd zoggy-backend
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Database Setup

```bash
# Start MongoDB (if running locally)
mongod

# Start Redis (if running locally)
redis-server
```

### 4. Development

```bash
# Start development server with hot reload
npm run dev

# In another terminal, start background workers
npm run jobs

# Seed fake usernames for wins feed
npm run seed:handles
```

### 5. Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start

# Start workers in production
NODE_ENV=production npm run jobs
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 8080 |
| `NODE_ENV` | Environment | No | development |
| `MONGO_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Yes | - |
| `REDIS_URL` | Redis connection string | Yes | - |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | No | http://localhost:3000 |
| `MAILCHIMP_API_KEY` | Mailchimp API key | No | - |
| `MAILCHIMP_SERVER_PREFIX` | Mailchimp server prefix (e.g., us15) | No | - |
| `MAILCHIMP_LIST_ID` | Mailchimp audience/list ID | No | - |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | No | - |
| `TELEGRAM_CHANNEL_ID` | Channel ID or @username | No | - |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook security secret | No | - |
| `PUBLIC_BASE_URL` | Public URL for webhooks | No | - |
| `ADMIN_EMAIL` | Admin login email | No | admin@zoggybet.com |
| `ADMIN_PASSWORD` | Admin login password | No | changeme |

### Mailchimp Setup

1. **Create Account**: Sign up at [mailchimp.com](https://mailchimp.com)
2. **Generate API Key**: 
   - Go to Account → Extras → API keys
   - Create new API key
   - Note the server prefix (e.g., `us15` from `abc123-us15`)
3. **Create Audience**:
   - Go to Audience → All contacts
   - Create new audience
   - Copy the Audience ID (List ID)
4. **Add Merge Fields** (optional):
   - Add `REFCODE` field for referral codes
   - Add `CLAIMCODE` field for claim codes
5. **Set up Automation** (optional):
   - Create welcome email automation
   - Trigger on "Audience signup"

### Telegram Setup

1. **Create Bot**:
   ```
   # Message @BotFather on Telegram
   /newbot
   # Follow prompts to create bot
   # Save the bot token
   ```

2. **Create Channel**:
   - Create a public channel (e.g., @zoggycasino)
   - Add your bot as administrator
   - Note the channel username or ID

3. **Set Webhook** (Production):
   ```bash
   # The webhook will be automatically set when server starts
   # URL format: https://yourdomain.com/telegram/webhook/YOUR_SECRET
   ```

4. **Get Channel ID** (if using numeric ID):
   ```bash
   # Add bot to channel, then check:
   curl "https://api.telegram.org/bot<BOT_TOKEN>/getUpdates"
   ```

## 📊 API Documentation

### Interactive Documentation
- **Development**: http://localhost:8080/docs
- **Production**: https://yourdomain.com/docs

### Key Endpoints

#### Public Endpoints
- `POST /waitlist` - Join waitlist with optional referral
- `GET /wins/latest` - Get fake wins feed
- `GET /leaderboard/top10` - Get top 10 referrers

#### Authenticated Endpoints
- `GET /auth/me` - Get user profile
- `POST /chest/open` - Open daily chest (requires Telegram verification)
- `GET /telegram/deeplink` - Get Telegram verification link

#### Admin Endpoints
- `POST /auth/admin/login` - Admin authentication
- `GET /admin/users` - List/search users
- `GET /admin/exports/claim-codes.csv` - Export user data

## 🎯 Business Logic

### Waitlist & Referrals

1. **Signup Process**:
   - User provides email and optional referral code
   - System generates unique referral code and claim code
   - User added to Mailchimp list (if configured)
   - Referral relationship created if valid referral code provided

2. **Referral Eligibility**:
   - Referred user must verify email
   - Must verify Telegram channel membership
   - Must open at least one chest
   - Must pass anti-fraud checks

### Chest Opening System

1. **Requirements**:
   - Email verified
   - Telegram channel membership verified
   - 24-hour cooldown between opens

2. **Reward Distribution**:
   - **First chest**: 70% → $0.10, 30% → $0.20
   - **Regular chests**: 20% → $0, 60% → $0.10, 5% → $0.20, 5% → $0.50, 5% → $1.00
   - **Never awards big wins** ($10-$10,000) to real users

### Anti-Fraud System

1. **IP-based Detection**:
   - Max 5 signups per IP per 24 hours
   - Flags referrers with >30% referrals from same IP subnet

2. **Device Fingerprinting**:
   - Tracks device fingerprints via `x-device-fp` header
   - Max 3 signups per device per 24 hours

3. **Pattern Detection**:
   - Suspicious referral clustering
   - Rapid signup patterns
   - Admin flagging system

### Fake Wins Feed

1. **Generation Cadence**:
   - Base: 1 event every 60-120 seconds
   - Micro-bursts: 3-5 events every 6-10 minutes
   - Lulls: 4-5 minute pauses periodically

2. **Big Win Constraints**:
   - Max one >$10,000 win per 3 hours
   - Max one >$2,000 win per hour
   - Follow-up small wins after big wins

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Coverage
- **Waitlist**: Signup, referrals, anti-fraud
- **Chest Opening**: Cooldowns, rewards, requirements
- **Telegram**: Token generation, verification
- **Leaderboard**: Ranking, eligibility, fraud detection

### Statistical Testing
The chest reward system includes statistical validation:
- 10,000 trial runs verify reward distribution accuracy
- Ensures no big wins (>$10) are ever awarded
- Validates first vs. regular chest probability differences

## 🚀 Deployment

### Render Deployment

1. **Create Services**:
   - **Web Service**: For API server
   - **Background Worker**: For BullMQ jobs

2. **Environment Variables**:
   - Set all required environment variables
   - Use MongoDB Atlas for database
   - Use Upstash Redis for cache/jobs

3. **Build Settings**:
   ```bash
   # Build command
   npm run build
   
   # Start command (Web Service)
   npm start
   
   # Start command (Worker Service)
   npm run jobs
   ```

### Health Checks
- **Endpoint**: `GET /healthz`
- **Response**: `{"ok": true, "timestamp": "2024-01-01T00:00:00.000Z"}`

### Monitoring
- Structured logging with Pino
- Error tracking and alerting
- Performance metrics via middleware
- Queue monitoring through Redis

## 📝 Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run jobs             # Start background workers

# Production
npm run build            # Compile TypeScript
npm start               # Start production server

# Testing
npm test                # Run test suite
npm run test:coverage   # Run tests with coverage
npm run test:watch      # Run tests in watch mode

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format code with Prettier

# Utilities
npm run seed:handles    # Seed fake usernames for wins
npm run snapshot:leaderboard  # Manual leaderboard refresh
```

## 🔒 Security Features

- **JWT Authentication** with role-based access control
- **Rate Limiting** on all endpoints
- **Input Validation** with Zod schemas
- **SQL Injection Protection** via Mongoose
- **CORS Configuration** with origin whitelist
- **Helmet Security Headers**
- **Anti-Fraud Detection** with pattern analysis
- **Secure Password Handling** (admin accounts)

## 📈 Performance

- **Database Indexing** on frequently queried fields
- **Redis Caching** for session data and rate limiting
- **Background Jobs** for heavy operations
- **Pagination** for large data sets
- **Connection Pooling** for database efficiency
- **Graceful Shutdown** handling

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow existing code style
- Use conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` endpoint when server is running
- **Issues**: Create GitHub issues for bugs and feature requests
- **Email**: help@zoggybet.com

## 🎯 Roadmap

- [ ] WebSocket support for real-time updates
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app API extensions
- [ ] Advanced fraud detection with ML
- [ ] Social media integrations
- [ ] Automated testing pipeline
- [ ] Performance monitoring dashboard

---

Built with ❤️ for the Zoggy community