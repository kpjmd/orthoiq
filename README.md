# OrthoIQ - Ask the Orthopedic AI

A production-ready Farcaster mini-app that provides AI-powered orthopedic and sports medicine insights through interactive frames and a native mini-app experience.

## Features

### Core Functionality
- **Specialized AI Responses**: Claude AI trained for orthopedic and sports medicine questions
- **Dual Interface**: Both Farcaster Frames and native Mini App support
- **Multi-Tier System**: Basic (1/day), Authenticated (3/day), Medical (10/day) question limits
- **Content Filtering**: AI-powered screening to ensure orthopedic relevance
- **Visual Artwork**: Dynamic SVG generation based on question context
- **Medical Disclaimers**: Appropriate safety warnings on all responses

### Security & Authentication
- **Farcaster Authentication**: Quick Auth integration for verified users
- **Secure Admin Panel**: BCrypt-hashed password authentication
- **Rate Limiting**: Multi-layer protection (user-based + IP-based)
- **Input Sanitization**: XSS and injection attack prevention
- **Security Headers**: CSP, XSS protection, and content type enforcement

### Advanced Features
- **Notification System**: Push notifications for Farcaster Mini Apps
- **Response Review System**: Medical professional review workflow
- **Analytics Dashboard**: Comprehensive usage and quality metrics
- **Training Data Export**: AI training data generation from reviewed responses
- **Health Monitoring**: Database and API health check endpoints

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **UI/Styling**: Tailwind CSS with medical-themed design system
- **AI Integration**: Anthropic Claude API with specialized prompts
- **Authentication**: Farcaster Auth Kit + Quick Auth
- **Frames**: frames.js for Farcaster integration
- **Mini App**: Farcaster Mini App SDK
- **Database**: Neon Serverless PostgreSQL
- **Security**: BCryptJS, security headers, input validation
- **Rate Limiting**: Multi-tier in-memory + IP-based protection
- **Deployment**: Vercel (recommended)

### Project Structure
```
orthoiq/
├── app/
│   ├── api/
│   │   ├── claude/          # Claude AI API integration
│   │   ├── frames/          # Farcaster Frame routes  
│   │   ├── admin/           # Admin analytics & management
│   │   ├── auth/            # Authentication endpoints
│   │   ├── notifications/   # Push notification system
│   │   └── health/          # Health check endpoints
│   ├── frames/              # Frame implementation
│   ├── mini/                # Farcaster Mini App
│   ├── admin/               # Admin dashboard
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/
│   ├── OrthoFrame.tsx       # Frame component
│   ├── AuthProvider.tsx     # Authentication context
│   ├── ResponseCard.tsx     # AI response display
│   ├── ActionMenu.tsx       # User interaction menu
│   └── ArtworkGenerator.tsx # SVG artwork generation
├── lib/
│   ├── claude.ts            # Claude API client
│   ├── database.ts          # Database operations
│   ├── rateLimit.ts         # Multi-tier rate limiting
│   ├── security.ts          # Input validation & filtering
│   ├── notifications.ts     # Push notification system
│   └── types.ts             # TypeScript definitions
├── scripts/
│   └── generate-admin-hash.js # Password hashing utility
└── public/                  # Static assets
```

## Setup Instructions

### 1. Environment Variables
Create `.env.local` with:
```bash
# Required - AI Service
ANTHROPIC_API_KEY=your_anthropic_api_key

# Required - Database
DATABASE_URL=your_neon_postgres_connection_string

# Required - App Configuration
NEXT_PUBLIC_HOST=http://localhost:3000
FARCASTER_HUB_URL=https://hub-api.neynar.com

# Required - Admin Security
ADMIN_PASSWORD_HASH=your_bcrypt_hashed_password
ADMIN_API_KEY=your_secure_random_api_key

# Optional - External Services
NEYNAR_API_KEY=your_neynar_api_key
CRON_SECRET=your_cron_secret_key
```

#### Generating Secure Admin Credentials
```bash
# Generate admin password hash
node scripts/generate-admin-hash.js "your_secure_password"

# Generate API key (use a secure random string)
openssl rand -hex 32
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
The app will automatically create required tables on first run.

### 4. Development
```bash
npm run dev
```

Visit `http://localhost:3000` to see the landing page.

### 5. Testing

#### Farcaster Frames
Use the Warpcast Developer Playground at `https://warpcast.com/~/developers/frames` with your local URL or deployed URL.

#### Mini App Testing
1. Visit `/mini` route for the Farcaster Mini App experience
2. Test authentication flows with Farcaster Auth
3. Verify notification permissions and functionality

## Security Features

### Multi-Layer Rate Limiting
- **User Tiers**: Basic (1/day), Authenticated (3/day), Medical (10/day)
- **IP-Based**: 100 requests per hour per IP address
- **Calendar Day Reset**: Limits reset at midnight UTC
- **Abuse Prevention**: Delays and monitoring for suspicious activity

### Authentication & Authorization
- **Farcaster Quick Auth**: Secure OAuth-style authentication
- **Admin Panel**: BCrypt-hashed password authentication
- **API Key Protection**: Environment-based admin API keys
- **Session Management**: Secure token handling

### Input Security
- **Content Sanitization**: XSS and HTML injection prevention
- **Medical Relevance**: AI-powered content filtering
- **Emergency Detection**: Automatic screening for medical emergencies
- **Spam Protection**: Pattern-based spam detection

### Infrastructure Security
- **Security Headers**: CSP, XSS Protection, Content-Type enforcement
- **HTTPS Enforcement**: Secure connections required
- **Error Handling**: No sensitive information in error responses
- **Database Security**: Parameterized queries prevent SQL injection

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Configure domain settings for Mini App
4. Deploy with default Next.js settings

### Production Environment Variables
Ensure these are set in your production environment:
```bash
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgres://...@neon.tech/...
ADMIN_PASSWORD_HASH=$2b$12$...
ADMIN_API_KEY=your-64-char-hex-key
NEXT_PUBLIC_HOST=https://your-domain.com
FARCASTER_HUB_URL=https://hub-api.neynar.com
```

### Database (Neon)
- **Serverless PostgreSQL**: Neon provides auto-scaling database
- **Connection Pooling**: Built-in pooling for serverless functions
- **Auto-Schema**: Tables and indexes created automatically on startup
- **Branching**: Use Neon branches for staging environments

## API Endpoints

### Core Application

#### `/api/claude` (POST)
Main AI endpoint for processing orthopedic questions.

**Request:**
```json
{
  "question": "What should I do for knee pain?",
  "fid": "12345",
  "tier": "authenticated"
}
```

**Response:**
```json
{
  "response": "Knee pain can have various causes...",
  "confidence": 0.85,
  "isFiltered": false,
  "isApproved": true,
  "isPendingReview": false,
  "reviewedBy": "Dr. Smith"
}
```

#### `/api/frames/route` (POST)
Farcaster Frame interaction endpoint.

#### `/api/rate-limit-status` (GET)
Check user's current rate limit status.

**Query Parameters:**
- `fid`: User's Farcaster ID
- `tier`: User tier (basic/authenticated/medical)

### Admin Endpoints

#### `/api/admin/analytics` (GET)
Comprehensive analytics dashboard data.

**Headers:**
```
Authorization: Bearer your_admin_api_key
```

#### `/api/admin/password-auth` (POST)
Admin password authentication.

**Request:**
```json
{
  "password": "admin_password"
}
```

#### `/api/admin/pending-responses` (GET)
Get responses awaiting medical review.

#### `/api/admin/review-response` (POST)
Submit medical professional review.

### Health & Monitoring

#### `/api/health` (GET)
Overall application health status.

#### `/api/health/database` (GET)
Database connectivity and performance.

#### `/api/health/claude` (GET)
Claude AI API connectivity status.

### Notifications

#### `/api/notifications` (POST)
Register for push notifications.

#### `/api/notifications/reset-daily` (POST)
Daily reset cron job endpoint.

## Customization

### Branding
- Update colors in `tailwind.config.js`
- Modify medical themes in `globals.css`
- Replace artwork in `ArtworkGenerator.tsx`

### AI Behavior
- Adjust prompts in `lib/claude.ts`
- Modify confidence thresholds
- Update medical disclaimers

### Rate Limits
- Configure limits in `lib/rateLimit.ts`
- Switch to Redis for production scaling

## Security Best Practices

### Environment Setup
- **Never commit secrets**: Keep `.env` files in `.gitignore`
- **Use strong passwords**: Generate secure admin credentials
- **Rotate keys regularly**: Change API keys and passwords periodically
- **Environment separation**: Use different credentials for development/production

### Production Deployment
- **HTTPS only**: Ensure all traffic is encrypted
- **Monitor logs**: Watch for suspicious activity patterns
- **Database backups**: Regular automated backups
- **Update dependencies**: Keep packages current for security patches

### Monitoring
- **Rate limit alerts**: Monitor for abuse patterns
- **Error tracking**: Implement comprehensive error logging
- **Performance monitoring**: Track API response times
- **Security scanning**: Regular vulnerability assessments

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Test thoroughly with Farcaster frames and Mini App
4. Ensure all security checks pass
5. Submit pull request with detailed description

## License

MIT License - see LICENSE file for details.

## Creator

Built by **KPJMD** - [Farcaster Profile](https://warpcast.com/kpjmd)

### Support & Issues
- Report bugs via GitHub Issues
- Feature requests welcome
- Security issues: contact directly via Farcaster

---

⚠️ **Medical Disclaimer**: This application provides educational information only and should not replace professional medical advice. Always consult qualified healthcare providers for medical concerns.

🔒 **Security Notice**: This application implements multiple security layers. Report any security concerns immediately.