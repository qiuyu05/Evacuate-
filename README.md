# 🚨 EchoAid - Intelligent Disaster Evacuation System

<div align="center">

![EchoAid Logo](https://img.shields.io/badge/EchoAid-Evacuation%20AI-blue?style=for-the-badge)
[![Python](https://img.shields.io/badge/Python-3.11+-green?style=flat-square&logo=python)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18+-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1+-black?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-orange?style=flat-square&logo=socket.io)](https://socket.io/)

**AI-powered real-time evacuation guidance system for emergency situations**

[Features](#-features) • [Setup](#-setup) • [Usage](#-usage) • [Architecture](#-architecture) • [Demo](#-demo)

</div>

---

## 📖 Overview

**EchoAid** is an intelligent disaster evacuation companion system designed for the **University of Waterloo Mathematics & Computer Building (MC Building, Floor 1)**. It uses AI-powered routing, real-time location tracking, and live coordination to guide people to safety during emergency evacuations.

### 🎯 Key Highlights

- 🤖 **Gemini AI** - Intelligent route optimization and blockage analysis
- 📍 **GPS Tracking** - Real-time location monitoring with gyroscope integration
- 🗺️ **Live Map** - Interactive floor plan with dynamic routing
- 👥 **Multi-User Sync** - See other evacuees in real-time
- 🔊 **Voice Alerts** - Natural language blockage reporting
- ⚡ **Instant Rerouting** - Dynamic path adjustments based on obstacles

---

## ✨ Features

### 🧠 Intelligent Routing
- **AI-Powered Pathfinding**: Gemini AI suggests optimal evacuation routes
- **Congestion Awareness**: Balances exit loads to prevent bottlenecks
- **Dynamic Rerouting**: Automatic path recalculation when blockages are reported
- **Multi-Exit Support**: 4 emergency exits with load balancing

### 📱 Real-Time Tracking
- **GPS Integration**: High-accuracy location tracking
- **Gyroscope/Compass**: Direction awareness (which way user is facing)
- **Live Position Updates**: Every 2 seconds via Socket.IO
- **Multi-User Visualization**: See all evacuees on the map with direction indicators

### 🚧 Blockage Management
- **Natural Language Reports**: "Fire in hallway" → AI parses location/severity
- **Severity Classification**: LOW, MEDIUM, HIGH, CRITICAL
- **Automatic Rerouting**: Affected users are instantly notified and rerouted
- **Visual Indicators**: Red zones on map showing blocked areas

### 🎮 Dual Mode Operation
- **SIMULATION Mode**: Test and visualize evacuation scenarios
- **LIVE Mode**: Real-time tracking with phone sensors

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     EchoAid System                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📱 Frontend (React + Socket.IO Client)                    │
│  ├─ Interactive Floor Plan (SVG)                           │
│  ├─ GPS/Gyroscope Integration                              │
│  ├─ Real-time Position Updates                             │
│  └─ Live User Markers                                       │
│                          ↕                                  │
│              WebSocket (Socket.IO)                          │
│                          ↕                                  │
│  🖥️ Backend (Flask + Socket.IO Server)                     │
│  ├─ 🤖 Gemini AI Service (Route Intelligence)              │
│  ├─ 🗺️ Pathfinding Service (A* Algorithm)                  │
│  ├─ 💾 Backboard.io (Memory/State Management)              │
│  └─ 🔄 Real-time Event Broadcasting                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

#### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Socket.IO Client** - Real-time communication
- **SVG** - Floor plan visualization

#### Backend
- **Flask 3.1** - Web framework
- **Flask-SocketIO** - WebSocket support
- **Google Gemini AI** - Intelligent routing
- **Backboard.io** - State management
- **Python 3.11+**

---

## 🚀 Setup

### Prerequisites

- **Python 3.11+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Ngrok** (optional, for remote access) ([Download](https://ngrok.com/))

### 1️⃣ Clone Repository

```bash
git clone https://github.com/qiuyu05/Evacuate.git
cd Evacuate
```

### 2️⃣ Backend Setup

```bash
cd echoaid-server

# Create virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your API keys:
# - GEMINI_API_KEY (get from https://makersuite.google.com/app/apikey)
# - BACKBOARD_API_KEY (get from https://backboard.io/dashboard)
```

### 3️⃣ Frontend Setup

```bash
cd echoaid-app

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🎮 Usage

### Running the Application

#### 1. Start Backend Server

```bash
cd echoaid-server
python3 app.py
```

Server runs on: `http://localhost:5001`

#### 2. Start Frontend

```bash
cd echoaid-app
npm run dev
```

Frontend runs on: `http://localhost:5173`

#### 3. Access Application

**On Computer:**
- Open `http://localhost:5173` in browser

**On Phone (Same WiFi):**
- Find your computer's IP: Check server startup logs
- Open `http://YOUR_IP:5173` on phone browser

**On Phone (Internet):**
```bash
# In a new terminal
ngrok http 5001

# Use the ngrok HTTPS URL in your app
```

---

## 📱 Using Live Mode

### Step 1: Enable Sensors (Phone)

1. Open app on phone browser
2. Switch to **LIVE** mode
3. Click **"🔓 Unlock Sensors"**
4. Grant permission for:
   - Motion & Orientation (gyroscope)
   - Location (GPS)

### Step 2: Connect to Server

1. Enter server URL in app:
   - Local: `http://YOUR_IP:5001`
   - Internet: `https://your-ngrok-url.ngrok-free.dev`
2. Click **Connect**
3. Wait for **🟢 Connected** status

### Step 3: Start Evacuation

1. Click **"Start Evacuation"**
2. Select starting location (or use current GPS)
3. Follow the route on the map
4. Walk around - your position updates in real-time!

### Step 4: Report Blockages

1. Click **"🚨 Report Blockage"**
2. Describe the obstacle:
   - "Fire in hallway"
   - "Debris blocking exit"
   - "Crowded area near room 1040"
3. AI processes your report and reroutes affected users

---

## 🗺️ Map Features

### Floor Plan Elements

- **🟢 Green Paths** - Hallway waypoints (526 navigation nodes)
- **🚪 Blue Boxes** - Rooms with labels
- **🟥 Red Zones** - Blocked areas/obstacles
- **🟠 Orange Dots** - Other users (live)
- **🔵 Blue Dot** - Your location
- **➡️ Arrows** - Direction indicators (heading)
- **🎯 Exit Signs** - 4 emergency exits

### Interactive Controls

- **Click rooms** - Set as destination
- **Drag map** - Pan view
- **Zoom** - Scroll to zoom in/out
- **Admin mode** - View all users simultaneously

---

## 🤖 Gemini AI Features

### Blockage Parsing

AI understands natural language:

```
User: "There's fire in the hallway near room 1040"

AI Output:
{
  "location": "p1040",
  "severity": "CRITICAL",
  "type": "FIRE",
  "needsImmediate": true
}
```

### Route Optimization

AI considers:
- Shortest path to exit
- Current exit congestion
- Blocked nodes/areas
- User distribution

```python
Example AI Response:
{
  "exit": "p200",
  "reason": "Least congested exit (2 users) with shortest path",
  "priority": "HIGH"
}
```

---

## 📡 API Endpoints

### WebSocket Events (Socket.IO)

#### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `join_evacuation` | `{name, startNode}` | User joins evacuation |
| `position_update` | `{currentNode, progress, heading, gps}` | Send position update |
| `gps_update` | `{latitude, longitude, accuracy, heading, speed}` | High-frequency GPS |
| `report_blockage` | `{message}` | Report obstacle |
| `request_reroute` | `{}` | Manual reroute request |

#### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `route_assigned` | `{route, destination, reason}` | Evacuation route |
| `user_position` | `{userId, name, currentNode, heading, gps}` | Other user moved |
| `user_gps` | `{userId, latitude, longitude, heading}` | Other user GPS |
| `blockage_added` | `{location, severity, type, message}` | New blockage reported |
| `blockage_alert` | `{location, distance, severity}` | Blockage nearby alert |

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Server status |
| `GET` | `/health` | Health check |

---

## 🛠️ Configuration

### Environment Variables

```env
# Server Configuration
PORT=5001
HOST=0.0.0.0

# Gemini AI (Google)
GEMINI_API_KEY=your-gemini-api-key

# Backboard.io (Memory Service)
BACKBOARD_API_KEY=your-backboard-key

# ElevenLabs (Text-to-Speech, optional)
ELEVENLABS_API_KEY=your-elevenlabs-key
```

### Getting API Keys

1. **Gemini AI**: https://makersuite.google.com/app/apikey
2. **Backboard.io**: https://backboard.io/dashboard
3. **ElevenLabs**: https://elevenlabs.io/api

---

## 🧪 Testing

### Simulation Mode (No Phone Required)

1. Open `http://localhost:5173`
2. Stay in **SIMULATION** mode
3. Click users (alpha, beta, gamma, delta)
4. Click rooms to set destinations
5. Watch simulated evacuation

### Live Mode Testing

1. Open on phone
2. Enable sensors
3. Connect to server
4. Start evacuation
5. Walk around building
6. Open on laptop to see your live position

---

## 🏢 Building Data

### MC Building - 1st Floor

- **Total Nodes**: 700+ waypoints
- **Rooms**: 100+ labeled rooms
- **Exits**: 4 emergency exits
- **Coordinate Space**:
  - X: 1309 - 4255.5
  - Y: 330.5 - 3111.5
- **Data Source**: Extracted from architectural PDF using OpenCV + Tesseract

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**University of Waterloo - Disaster Evacuation Project**

- Built for MC Building emergency preparedness
- Powered by Gemini AI and real-time location tracking

---

## 🙏 Acknowledgments

- **Google Gemini AI** - Intelligent routing
- **Backboard.io** - State management
- **Socket.IO** - Real-time communication
- **OpenStreetMap** - Mapping inspiration
- **University of Waterloo** - Building data

---

## 📞 Support

For issues or questions:
- 🐛 **Report bugs**: [GitHub Issues](https://github.com/qiuyu05/Evacuate/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/qiuyu05/Evacuate/discussions)

---

<div align="center">

**Made with ❤️ for Safety and Emergency Preparedness**

[⬆ Back to Top](#-echoaid---intelligent-disaster-evacuation-system)

</div>
