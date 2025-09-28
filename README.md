# Traffic Automation & Smart Cab Booking System

An intelligent traffic monitoring system that tracks real-time traffic conditions between specified locations and automatically manages cab bookings when optimal travel times are detected. The system monitors traffic using Google Maps API, sends SMS notifications via Twilio when travel times drop below user-defined thresholds, and automatically books Ola cabs on behalf of users using HTTP requests to the Ola Developer API. Features comprehensive alert management with cancellation and reactivation capabilities, with all user routes and performance data stored persistently in Supabase for cross-session access and analytics.

## Features

- Real-time traffic monitoring with Google Maps API
- SMS alerts via Twilio when conditions improve
- **Automatic Ola cab booking using Ola Developer API requests on behalf of authenticated users**
- **OAuth-based user authentication for secure cab booking via Ola API**
- Alert cancellation and reactivation
- Username-based alert management
- Persistent route storage in Supabase

## Tech Stack

**Frontend (3000):** JavaScript, HTML, CSS, React  
**Backend (3001):** Node.js, Express  
**Database:** Supabase PostgreSQL  
**APIs:** Google Maps, Twilio, Ola Developer Platform

## Installation

Backend
cd backend && npm install && npm run dev

Frontend
cd frontend && npm install && npm start



## Environment Setup

GOOGLE_MAPS_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
OLA_APP_TOKEN=your_ola_app_token
SUPABASE_URL=your_url



## Automated Booking Process

The system uses Ola's booking API to automatically book cabs:

1. Users authenticate with Ola via OAuth
2. When traffic conditions improve, system makes `POST /v1.5/bookings/create` requests
3. Booking details stored with `ride_id` for tracking
4. Users receive SMS with booking confirmation

## Usage

1. Create alerts with pickup/destination locations
2. Set travel time thresholds and enable auto-booking
3. System monitors traffic automatically
4. Receive SMS when conditions improve
5. **System automatically books Ola cab using stored OAuth tokens**
6. Manage alerts through dashboard

## API Endpoints

POST /api/alerts # Create alert
GET /api/alerts/:username # Get alerts
PUT /api/alerts/:id/cancel # Cancel alert


## License

MIT
