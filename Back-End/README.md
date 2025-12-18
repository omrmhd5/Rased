# Rased Backend API

Backend API for the Rased Anti-Piracy Reporting Platform built with Node.js, Express, and MongoDB.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (running on localhost:27017)

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration (see below).

## Environment Variables

Create a `.env` file with the following variables:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/rased
FRONTEND_URL=http://localhost:5173

# External API Configuration (Perform Feeds)
EXTERNAL_API_URL=https://api.performfeeds.com/soccerdata/match/ft1tiv1inq7v1sk3y9tv12yh5/
EXTERNAL_API_TMCL=6ru2ri6bqeg9l7av4ppdpdx5g
EXTERNAL_API_JSONP_CALLBACK=W33ea3696678db4fdef563c3095ccdc85f02d336e2
EXTERNAL_API_REFERER=https://optaplayerstats.statsperform.com/
```

### Variables Explanation:

- **PORT**: Server port (default: 5000)
- **NODE_ENV**: Environment mode (development/production)
- **MONGODB_URI**: MongoDB connection string (default: mongodb://localhost:27017/rased)
- **FRONTEND_URL**: Frontend URL for CORS configuration
- **EXTERNAL_API_URL**: External API endpoint URL for fetching matches
- **EXTERNAL_API_TMCL**: External API tournament/competition code
- **EXTERNAL_API_JSONP_CALLBACK**: JSONP callback function name
- **EXTERNAL_API_REFERER**: Referer header value for API requests

## Running the Server

### Development mode (with auto-reload):

```bash
npm run dev
```

### Production mode:

```bash
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## API Endpoints

### Health Check

- `GET /api/health` - Check API status

### Matches

- `GET /api/matches` - Get all matches
- `GET /api/matches/:id` - Get single match
- `POST /api/matches` - Create new match
- `PUT /api/matches/:id` - Update match
- `DELETE /api/matches/:id` - Delete match
- `GET /api/matches/:id/stats` - Get match statistics

### Violations

- `GET /api/violations` - Get all violations (with filters)
- `GET /api/violations/:id` - Get single violation
- `POST /api/violations` - Create new violation
- `PUT /api/violations/:id` - Update violation
- `PATCH /api/violations/:id/status` - Update violation status
- `DELETE /api/violations/:id` - Delete violation

### Platforms

- `GET /api/platforms` - Get all platforms
- `GET /api/platforms/:id` - Get single platform
- `POST /api/platforms` - Create new platform
- `PUT /api/platforms/:id` - Update platform
- `DELETE /api/platforms/:id` - Delete platform
- `GET /api/platforms/:id/stats/:matchId` - Get platform statistics for a match

## Database Models

### Match

- `description`: String
- `team1`: String (required)
- `team2`: String (required)
- `date`: Date (required)
- `time`: String (required)
- `status`: Enum (upcoming, live, finished, cancelled)
- `week`: String
- `competition`: String
- `stadium`: String
- `statusHistory`: Array of status changes

### Violation

- `matchId`: ObjectId (ref: Match, required)
- `platformId`: String (required)
- `status`: Enum (reported, active, blocked, removed, review, pending)
- `statusBadge`: Enum (reported, active, blocked, review, pending)
- `type`: Enum (Live, Highlights, Other)
- `url`: String (required)
- `accountHandle`: String
- `views`: String
- `timeAdded`: Date
- `blockedAt`: Date
- `stillActive`: Boolean
- `notes`: String
- `statusHistory`: Array of status changes

### Platform

- `id`: String (unique, required)
- `name`: String (required)
- `color`: String (required)
- `icon`: String (required)

## MongoDB Setup

Make sure MongoDB is running on your local machine:

```bash
# Start MongoDB (if installed locally)
mongod

# Or if using MongoDB as a service
# On Windows: net start MongoDB
# On macOS: brew services start mongodb-community
# On Linux: sudo systemctl start mongod
```

The database will be automatically created when you first run the server.
