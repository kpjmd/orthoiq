# OrthoIQ - Ask the Orthopedic AI

A Farcaster mini-app that provides AI-powered orthopedic and sports medicine insights through interactive frames.

## Features

- **Specialized AI Responses**: Claude AI trained for orthopedic and sports medicine questions
- **Farcaster Frame Integration**: Interactive frames for seamless user experience
- **Rate Limiting**: 1 question per day per user for quality control
- **Content Filtering**: AI-powered screening to ensure orthopedic relevance
- **Visual Artwork**: Dynamic SVG generation based on question context
- **Medical Disclaimers**: Appropriate safety warnings on all responses
- **Interaction Logging**: Database tracking for analytics and learning

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **UI/Styling**: Tailwind CSS with medical-themed design system
- **AI Integration**: Anthropic Claude API with specialized prompts
- **Frames**: frames.js for Farcaster integration
- **Database**: PostgreSQL with Vercel Postgres
- **Rate Limiting**: Redis or in-memory storage
- **Deployment**: Vercel (recommended)

### Project Structure
```
orthoiq/
├── app/
│   ├── api/
│   │   ├── claude/          # Claude API integration
│   │   ├── frames/          # Frame API routes  
│   │   └── admin/           # Admin analytics
│   ├── frames/              # Main frame logic
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles
├── components/
│   ├── OrthoFrame.tsx       # Main interactive component
│   ├── Disclaimer.tsx       # Medical disclaimers
│   └── ArtworkGenerator.tsx # SVG artwork generation
├── lib/
│   ├── claude.ts            # Claude API client
│   ├── database.ts          # Database operations
│   ├── rateLimit.ts         # Rate limiting logic
│   └── types.ts             # TypeScript definitions
└── public/                  # Static assets
```

## Setup Instructions

### 1. Environment Variables
Create `.env.local` with:
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
DATABASE_URL=your_postgres_database_url
REDIS_URL=your_redis_url
NEXT_PUBLIC_HOST=http://localhost:3000
FARCASTER_HUB_URL=https://hub-api.neynar.com
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

### 5. Testing Frames
Use the Warpcast Developer Playground at `https://warpcast.com/~/developers/frames` with your local URL or deployed URL.

## Security Features

### Rate Limiting
- 1 question per day per Farcaster FID
- Prevents abuse and maintains quality
- Configurable limits via environment variables

### Content Filtering
- AI-powered relevance checking
- Only orthopedic/sports medicine questions allowed
- Automatic filtering of off-topic queries

### Medical Safety
- Prominent disclaimers on all responses
- Educational information only
- Strong recommendations to consult healthcare providers

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy with default Next.js settings

### Database
- Use Vercel Postgres for production
- Tables auto-create on first API call
- Consider implementing cleanup scripts for old data

## API Endpoints

### `/api/claude` (POST)
Main AI endpoint for processing questions.

**Request:**
```json
{
  "question": "What should I do for knee pain?",
  "fid": "12345"
}
```

**Response:**
```json
{
  "response": "Knee pain can have various causes...",
  "confidence": 0.85,
  "isFiltered": false
}
```

### `/api/admin/analytics` (GET)
Analytics endpoint (requires authentication).

**Headers:**
```
Authorization: Bearer admin-secret
```

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

## Contributing

1. Fork the repository
2. Create feature branch
3. Test thoroughly with Farcaster frames
4. Submit pull request

## License

MIT License - see LICENSE file for details.

## Creator

Built by **KPJMD** - [Farcaster Profile](https://warpcast.com/kpjmd)

---

⚠️ **Medical Disclaimer**: This application provides educational information only and should not replace professional medical advice. Always consult qualified healthcare providers for medical concerns.