# WebRTC Video Calling Implementation

## Overview
This document describes the WebRTC peer-to-peer video calling system that replaces the Jitsi Meet integration.

## Architecture

### Backend Components

#### 1. WebRTC Signaling Server (`server/src/config/socket.js`)
Handles WebRTC signaling between peers:
- `webrtc:offer` - Sends connection offer from tutor to learner
- `webrtc:answer` - Sends connection answer from learner to tutor
- `webrtc:ice-candidate` - Exchanges ICE candidates for NAT traversal
- `webrtc:end-call` - Notifies peer when call ends

#### 2. Request Controller (`server/src/controllers/requestController.js`)
- Removed Jitsi Meet link generation
- Emits `session:accepted` socket event when tutor accepts request
- Triggers automatic video call start for both users

### Frontend Components

#### 1. VideoCall Component (`client/src/components/VideoCall.js`)
Complete WebRTC implementation with:
- RTCPeerConnection setup with Google STUN servers
- Local and remote video stream management
- Audio mute/unmute control
- Video on/off control
- End call functionality
- Connection state management
- Socket event listeners for signaling

**Props:**
- `socket` - Socket.io connection for signaling
- `requestId` - Unique session identifier
- `localUserId` - Current user's ID
- `remoteUserId` - Remote peer's ID
- `isInitiator` - Boolean (true for tutor, false for learner)
- `onCallEnd` - Callback when call ends

#### 2. LearnerPage Integration (`client/src/components/LearnerPage.js`)
- Listens for `session:accepted` socket event
- Automatically displays VideoCall when tutor accepts
- "Join Video Call" button for accepted sessions
- Auto-refreshes session list after call ends

#### 3. TutorPage Integration (`client/src/components/TutorPage.js`)
- Starts video call immediately when accepting request
- "Start Video Call" button for accepted sessions
- "Mark Complete" button to end session
- Auto-completes session when video call ends

### UI Styling (`client/src/components/VideoCall.css`)
- Full-screen video call layout
- Picture-in-picture local video
- Control buttons (mute, video, end call)
- Connection and waiting overlays
- Responsive design for mobile devices

## Workflow

### 1. Request Flow
```
Learner → Send Request → Tutor Receives Notification
```

### 2. Acceptance & Video Call Start
```
Tutor Accepts Request
  ↓
Backend emits session:accepted to learner
  ↓
Both users automatically start VideoCall component
  ↓
Tutor creates WebRTC offer → Learner receives offer
  ↓
Learner creates answer → Tutor receives answer
  ↓
ICE candidates exchanged
  ↓
Peer-to-peer connection established
  ↓
Video/audio streams active
```

### 3. Call End
```
User clicks "End Call"
  ↓
Socket event notifies peer
  ↓
Both connections close
  ↓
Tutor: Auto-completes session
  ↓
Learner: Prompted to review
```

## Key Features

### ✅ Implemented
- Peer-to-peer WebRTC video calling
- Audio mute/unmute control
- Video on/off control
- Automatic call start on acceptance
- Real-time connection state management
- Socket-based signaling
- Auto-complete session on call end
- Full-screen video interface
- Picture-in-picture local video
- Responsive mobile layout

### 🔧 Configuration
**STUN Servers** (in VideoCall.js):
```javascript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]
```

### 📝 Notes
- No external service required (Jitsi removed)
- Direct peer-to-peer connection
- Low latency for video/audio
- No video recording (sessions are live only)
- Browser must support WebRTC APIs
- Requires HTTPS in production for getUserMedia

## Testing Checklist

- [ ] Learner can send request
- [ ] Tutor receives notification
- [ ] Tutor can accept request
- [ ] Video call auto-starts for both users
- [ ] Audio mute/unmute works
- [ ] Video on/off works
- [ ] Both users can see/hear each other
- [ ] End call works from both sides
- [ ] Session auto-completes after call
- [ ] Review prompt appears for learner
- [ ] "Join Video Call" button works
- [ ] Connection state displays correctly
- [ ] Waiting overlay shows while connecting

## Browser Compatibility

**Supported Browsers:**
- Chrome/Edge (recommended)
- Firefox
- Safari 11+
- Opera

**Required Permissions:**
- Camera access
- Microphone access

## Future Enhancements

Potential improvements:
- Screen sharing capability
- Chat during video call
- Call recording option
- Connection quality indicator
- Noise cancellation
- Virtual backgrounds
- Multiple participants support
