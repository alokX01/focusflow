# FocusFlow Authentication Setup Guide

## Overview

FocusFlow now includes a complete authentication system with NextAuth.js, supporting both email/password and Google OAuth authentication.

## Features

- ✅ **Email/Password Authentication** - Traditional sign-up and sign-in
- ✅ **Google OAuth** - One-click sign-in with Google
- ✅ **Session Management** - Secure JWT-based sessions
- ✅ **Protected Routes** - Middleware-based route protection
- ✅ **User Profiles** - Complete user management system
- ✅ **Database Integration** - MongoDB Atlas with user data persistence

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/focusflow?retryWrites=true&w=majority

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Generate NextAuth Secret

Generate a secure secret for NextAuth.js:

```bash
openssl rand -base64 32
```

### 3. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret to your `.env.local`

### 4. MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database named `focusflow`
4. Create collections:
   - `users` - User profiles and authentication data
   - `sessions` - Focus session data
   - `distractions` - Distraction tracking data
   - `settings` - User preferences
5. Get your connection string and add to `.env.local`

## Authentication Flow

### Sign Up Process
1. User visits `/auth/signup`
2. Fills out registration form (name, email, password)
3. Password is hashed with bcrypt
4. User account is created in MongoDB
5. User is automatically signed in
6. Redirected to main application

### Sign In Process
1. User visits `/auth/signin`
2. Enters email and password OR clicks Google sign-in
3. Credentials are validated against database
4. JWT session is created
5. User is redirected to main application

### Protected Routes
- All routes except `/auth/*` require authentication
- Middleware automatically redirects unauthenticated users to sign-in
- Session is validated on each request

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js endpoints

### User Management
- `GET /api/users/me` - Get current user profile

### Sessions (Protected)
- `GET /api/sessions` - Get user's focus sessions
- `POST /api/sessions` - Create new focus session
- `GET /api/sessions/[id]` - Get specific session
- `PUT /api/sessions/[id]` - Update session
- `DELETE /api/sessions/[id]` - Delete session

### Analytics (Protected)
- `GET /api/analytics` - Get user analytics
- `GET /api/analytics/daily` - Get daily analytics

### Settings (Protected)
- `GET /api/settings` - Get user settings
- `POST /api/settings` - Update user settings

## Security Features

- **Password Hashing** - bcrypt with salt rounds
- **JWT Tokens** - Secure session management
- **CSRF Protection** - Built-in NextAuth.js protection
- **Route Protection** - Middleware-based authentication
- **Input Validation** - Server-side validation
- **Error Handling** - Secure error responses

## Usage in Components

### Using Authentication in React Components

```tsx
import { useSession, signIn, signOut } from 'next-auth/react'

function MyComponent() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <p>Loading...</p>
  if (status === 'unauthenticated') return <p>Please sign in</p>

  return (
    <div>
      <p>Welcome, {session?.user?.name}!</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

### Using API Client

```tsx
import { apiClient } from '@/lib/api-client'

// Get user settings
const settings = await apiClient.getSettings()

// Create a focus session
const session = await apiClient.createSession({
  targetDuration: 25,
  cameraEnabled: true
})
```

## Troubleshooting

### Common Issues

1. **"Unauthorized" errors**
   - Check if user is signed in
   - Verify session is valid
   - Check middleware configuration

2. **Database connection errors**
   - Verify MongoDB URI is correct
   - Check network connectivity
   - Ensure database exists

3. **Google OAuth not working**
   - Verify client ID and secret
   - Check redirect URIs
   - Ensure Google+ API is enabled

4. **Session not persisting**
   - Check NEXTAUTH_SECRET is set
   - Verify NEXTAUTH_URL is correct
   - Check browser cookies

### Development Tips

- Use browser dev tools to inspect network requests
- Check server logs for detailed error messages
- Test authentication flow in incognito mode
- Verify environment variables are loaded correctly

## Production Deployment

1. Set production environment variables
2. Update NEXTAUTH_URL to your domain
3. Configure production MongoDB URI
4. Set up Google OAuth for production domain
5. Enable HTTPS for security
6. Set up proper error monitoring

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review NextAuth.js documentation
3. Check MongoDB Atlas logs
4. Verify environment configuration

The authentication system is now fully integrated and ready for use! 🎉
