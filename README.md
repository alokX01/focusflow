# FocusFlow - AI-Powered Focus Tracking App

A modern focus tracking application that uses computer vision to monitor your attention and help you maintain concentration during work sessions.

## Features

- 🎯 **AI-Powered Focus Tracking** - Uses TensorFlow.js and MediaPipe for real-time attention monitoring
- ⏱️ **Pomodoro Timer** - Customizable focus and break sessions
- 📊 **Analytics Dashboard** - Detailed insights into your focus patterns and productivity
- 🌙 **Dark Mode** - Beautiful dark and light themes
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎨 **Modern UI** - Built with Tailwind CSS and Radix UI components

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Database**: MongoDB Atlas
- **AI/ML**: TensorFlow.js, MediaPipe Face Mesh
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account
- Modern browser with camera support

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd focusflow-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and add your MongoDB Atlas connection string:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/focusflow?retryWrites=true&w=majority
   ```

4. **Set up MongoDB Atlas**
   - Create a new cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a database user with read/write permissions
   - Whitelist your IP address
   - Copy the connection string to your `.env.local` file

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Sessions
- `GET /api/sessions?userId={id}` - Get user sessions
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/{id}` - Update session
- `DELETE /api/sessions/{id}` - Delete session
- `POST /api/sessions/{id}/distractions` - Add distraction

### Analytics
- `GET /api/analytics?userId={id}&period={week|month|year}` - Get analytics
- `GET /api/analytics/daily?userId={id}&date={YYYY-MM-DD}` - Get daily analytics

### Settings
- `GET /api/settings?userId={id}` - Get user settings
- `POST /api/settings` - Create/update settings

### Users
- `GET /api/users?userId={id}` - Get user profile
- `POST /api/users` - Create/update user profile

## Database Schema

### FocusSession
```typescript
{
  userId: string
  startTime: Date
  endTime?: Date
  duration: number // seconds
  targetDuration: number // seconds
  focusPercentage: number
  distractionCount: number
  isCompleted: boolean
  sessionType: 'focus' | 'break' | 'long-break'
  cameraEnabled: boolean
  distractions: DistractionEvent[]
  createdAt: Date
  updatedAt: Date
}
```

### UserSettings
```typescript
{
  userId: string
  focusDuration: number // minutes
  shortBreakDuration: number // minutes
  longBreakDuration: number // minutes
  longBreakInterval: number
  cameraEnabled: boolean
  notificationsEnabled: boolean
  soundEnabled: boolean
  theme: 'light' | 'dark' | 'system'
  createdAt: Date
  updatedAt: Date
}
```

### AnalyticsData
```typescript
{
  userId: string
  date: Date
  totalFocusTime: number // seconds
  totalSessions: number
  completedSessions: number
  averageFocusPercentage: number
  totalDistractions: number
  longestStreak: number // minutes
  dailyGoal: number // minutes
  goalAchieved: boolean
  createdAt: Date
  updatedAt: Date
}
```

## Usage

1. **First Time Setup**
   - Allow camera permissions when prompted
   - Configure your focus session preferences in Settings
   - Set up your camera for attention tracking

2. **Starting a Focus Session**
   - Click "Start Focus Session" on the main page
   - The app will monitor your attention using your camera
   - Focus percentage updates in real-time based on your attention

3. **Viewing Analytics**
   - Navigate to the Analytics page to see your progress
   - View weekly, monthly, or yearly trends
   - Track your focus patterns and improvement over time

4. **Settings**
   - Customize focus and break durations
   - Enable/disable camera tracking
   - Adjust notification preferences
   - Switch between light and dark themes

## Development

### Project Structure
```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── analytics/         # Analytics page
│   ├── history/           # History page
│   ├── settings/          # Settings page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── *.tsx             # Feature components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and API client
└── styles/               # Global styles
```

### Adding New Features

1. **API Endpoints**: Add new routes in `app/api/`
2. **Components**: Create new components in `components/`
3. **Hooks**: Add custom hooks in `hooks/`
4. **Types**: Update models in `lib/models.ts`

### Building for Production

```bash
npm run build
npm start
```

## Troubleshooting

### Camera Issues
- Ensure your browser has camera permissions
- Try refreshing the page if camera setup fails
- Check that you're using HTTPS in production

### Database Connection
- Verify your MongoDB Atlas connection string
- Check that your IP is whitelisted
- Ensure database user has proper permissions

### Performance
- The app uses TensorFlow.js which can be resource-intensive
- Consider reducing camera resolution for better performance
- Close other browser tabs to free up resources

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.
