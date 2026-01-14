# B2B Server Backend

A robust Node.js backend API built with Express and TypeScript for B2B applications.

## 🚀 Features

- **TypeScript**: Full TypeScript support with strict mode enabled
- **Express.js**: Fast, unopinionated web framework
- **PostgreSQL**: Robust relational database with connection pooling (graceful fallback in development)
- **JWT Authentication**: Secure authentication with JSON Web Tokens
- **Socket.IO**: Real-time communication and notifications
- **Cron Jobs**: Scheduled tasks for automated reminders
- **AWS S3 Integration**: File storage and management
- **Google OAuth**: Social authentication support
- **Input Validation**: Comprehensive request validation middleware
- **Error Handling**: Centralized error handling with proper logging
- **Security**: Helmet, CORS, compression, rate limiting, and security headers configured
- **Health Checks**: Health check endpoint for monitoring
- **Logging**: Structured logging with audit trails
- **Hot Reload**: Nodemon for development

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher) - optional for development
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd B2B_server/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. **Database setup (Optional for development)**
   - Create a PostgreSQL database
   - Update database credentials in `.env`
   - Server will start without database in development mode

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database Configuration (Optional for development)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=b2b_server_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DATABASE_URL=postgresql://user:password@localhost:5432/b2b_server_db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:4000

# Security
BCRYPT_SALT_ROUNDS=12

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
RESUME_AWS_S3_BUCKET_NAME=your-resume-bucket
AWS_PROFILE_PIC_BUCKET_NAME=your-profile-pic-bucket
BUSINESS_PROFILE_AWS_S3_BUCKET_NAME=your-business-bucket
JOB_APPLICATIONS_AWS_S3_BUCKET_NAME=your-applications-bucket
POSTS_AWS_S3_BUCKET_NAME=your-posts-bucket

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Other Services
GEMINI_API_KEY=your_gemini_api_key
PRIVATE_INFO_ENCRYPTION_KEY=your_encryption_key

# Logging
LOG_LEVEL=info
```

## 🚦 Running the Application

### Development
```bash
npm run dev
```

The server will start on `http://localhost:5000` with:
- Health check at `/health`
- API endpoints at `/api/*`
- Socket.IO for real-time communication
- Cron jobs for scheduled tasks

### Production
```bash
npm run build
npm start
```

### Other Commands
```bash
# Linting
npm run lint
npm run lint:fix

# Type checking
npm run build
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── env.ts        # Environment variables
│   │   └── database.ts   # Database connection
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── admin.controller.ts
│   │   ├── profile.controller.ts
│   │   ├── post.controller.ts
│   │   ├── contest.controller.ts
│   │   └── ...
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts       # Authentication middleware
│   │   └── errorHandler.ts
│   ├── routes/           # API routes
│   │   ├── index.ts      # Main router
│   │   ├── auth.route.ts
│   │   ├── admin.route.ts
│   │   ├── profile.route.ts
│   │   ├── post.route.ts
│   │   ├── contest.route.ts
│   │   └── ...
│   ├── services/         # Business logic
│   │   ├── authService.ts
│   │   ├── SocketService.ts
│   │   ├── CronService.ts
│   │   └── ...
│   ├── utils/            # Utility functions
│   ├── models/           # Data models
│   ├── types/            # TypeScript type definitions
│   ├── app.ts            # Express app setup
│   └── index.ts          # Server bootstrap
├── .env.example          # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## 🔗 API Endpoints

### Health Check
- `GET /health` - Server health status and uptime

### API Routes
- `GET /api/test` - Test endpoint to verify API is working

### Authentication (Currently disabled for development)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout (requires auth)
- `GET /api/auth/profile` - Get user profile (requires auth)
- `PUT /api/auth/profile` - Update user profile (requires auth)

### Other Routes (Currently disabled for development)
- `/api/admin` - Admin endpoints
- `/api/profile` - User profile management
- `/api/posts` - Social posts management
- `/api/contest` - Contest management
- `/api/jobs` - Job postings and applications
- `/api/chat` - Real-time messaging

## 🏥 Health Monitoring

The application provides health check:
- **Health Check** (`/health`): Complete system status including server uptime, environment, and database connectivity status

## 🔐 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing configured for frontend (http://localhost:4000)
- **JWT**: Secure authentication tokens
- **Rate Limiting**: Request rate limiting
- **Compression**: Gzip compression for responses
- **Input Validation**: Request validation middleware
- **SQL Injection Protection**: Parameterized queries

## 📝 Logging

Structured logging with different levels:
- **ERROR**: Error conditions
- **WARN**: Warning conditions (including missing environment variables)
- **INFO**: Informational messages (server startup, service initialization)
- **DEBUG**: Debug-level messages

## 🔌 Real-time Features

- **Socket.IO**: Real-time communication for notifications and messaging
- **Cron Jobs**: Scheduled tasks for automated reminders (runs every 4 hours)

## 📦 File Storage

- **AWS S3 Integration**: Multiple buckets for different file types
  - Resume uploads
  - Profile pictures
  - Business documents
  - Job applications
  - Post attachments

## 🔑 Social Authentication

- **Google OAuth**: Integration with Google for social login

## 🐳 Docker Support

Coming soon - Docker containerization support.

## 🧪 Testing

Coming soon - Unit and integration tests.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.

---

**Note**: This backend is part of the B2B Server monorepo and is designed to work with the corresponding frontend application. 