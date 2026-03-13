import React, { useEffect, useRef, useState } from 'react';
import './VideoCall.css';

const VideoCall = ({ 
  socket, 
  requestId, 
  localUserId, 
  remoteUserId, 
  isInitiator,
  onCallEnd 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketListenersSetup = useRef(false);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    // Validate props before initializing
    if (!socket || !requestId || !localUserId || !remoteUserId) {
      console.error('❌ VideoCall: Missing required props', {
        hasSocket: !!socket,
        hasRequestId: !!requestId,
        hasLocalUserId: !!localUserId,
        hasRemoteUserId: !!remoteUserId
      });
      return;
    }
    
    console.log(`🎬 VideoCall component mounted for request ${requestId}`);
    console.log(`👤 Local user: ${localUserId}, Remote user: ${remoteUserId}`);
    console.log(`🎯 Role: ${isInitiator ? 'INITIATOR (will send offer)' : 'RECEIVER (will wait for offer)'}`);
    
    initializeCall();

    return () => {
      console.log(`🛑 VideoCall component unmounting for request ${requestId}`);
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(iceServers);

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Handle incoming tracks
      peerConnectionRef.current.ontrack = (event) => {
        console.log('📹 Received remote track');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setIsConnected(true);
          setIsConnecting(false);
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate to user:', remoteUserId);
          if (!remoteUserId) {
            console.error('❌ Cannot send ICE candidate: remoteUserId is undefined!');
            return;
          }
          socket.emit('webrtc:ice-candidate', {
            to: remoteUserId,
            candidate: event.candidate,
            requestId
          });
          console.log('✅ ICE candidate sent');
        } else {
          console.log('🏁 ICE gathering complete (null candidate)');
        }
      };

      // Handle connection state changes
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current.connectionState;
        console.log('🔄 Connection state changed to:', state);
        
        if (state === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
          console.log('✅ WebRTC connection established!');
        } else if (state === 'connecting') {
          setIsConnecting(true);
          console.log('⏳ WebRTC connecting...');
        } else if (state === 'disconnected' || state === 'failed') {
          console.log('❌ Connection failed or disconnected');
          handleCallEnd();
        }
      };

      // Set up socket listeners
      setupSocketListeners();

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!isConnected && peerConnectionRef.current) {
          console.log('⏰ Connection timeout - retrying...');
          if (isInitiator) {
            console.log('🔄 Initiator retrying offer...');
            createOffer();
          }
        }
      }, 10000); // 10 second timeout

      // If initiator, wait a moment then create and send offer
      if (isInitiator) {
        console.log('📤 Initiator waiting before creating offer...');
        setTimeout(() => {
          console.log('📤 Creating WebRTC offer now...');
          createOffer();
        }, 500); // Small delay to ensure both sides are ready
      } else {
        console.log('📥 Non-initiator ready to receive offer');
      }

      return () => clearTimeout(connectionTimeout);
    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const setupSocketListeners = () => {
    if (socketListenersSetup.current) {
      console.log('⚠️ Socket listeners already set up, skipping');
      return;
    }
    
    console.log(`🎧 Setting up socket listeners for request ${requestId}`);
    socketListenersSetup.current = true;
    
    socket.on('webrtc:offer', async ({ offer, requestId: reqId }) => {
      console.log(`📞 [REQUEST ${requestId}] Received WebRTC offer for request ${reqId}`);
      console.log(`📦 Offer data:`, { hasOffer: !!offer, hasSDP: !!offer?.sdp });
      
      if (reqId === requestId) {
        console.log('✅ Offer matches our request, processing...');
        try {
          if (!peerConnectionRef.current) {
            console.error('❌ Peer connection not initialized!');
            return;
          }
          
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('📝 Remote description set, creating answer...');
          
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          console.log('📤 Sending answer back to user ' + remoteUserId);
          
          socket.emit('webrtc:answer', {
            to: remoteUserId,
            answer,
            requestId
          });
          console.log(`✅ Answer sent successfully`);
        } catch (error) {
          console.error('❌ Error handling offer:', error);
          console.error('Error details:', error.message);
        }
      } else {
        console.log(`⚠️ Offer for different request (${reqId}), ignoring`);
      }
    });

    socket.on('webrtc:answer', async ({ answer, requestId: reqId }) => {
      console.log(`📞 [REQUEST ${requestId}] Received WebRTC answer for request ${reqId}`);
      console.log(`📦 Answer data:`, { hasAnswer: !!answer, hasSDP: !!answer?.sdp });
      
      if (reqId === requestId) {
        console.log('✅ Answer matches our request, setting remote description...');
        try {
          if (!peerConnectionRef.current) {
            console.error('❌ Peer connection not initialized!');
            return;
          }
          
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('✅ Remote description set successfully!');
        } catch (error) {
          console.error('❌ Error setting remote description:', error);
          console.error('Error details:', error.message);
        }
      } else {
        console.log(`⚠️ Ignoring answer for different request (got ${reqId}, expected ${requestId})`);
      }
    });

    socket.on('webrtc:ice-candidate', async ({ candidate, requestId: reqId }) => {
      console.log(`🧊 [REQUEST ${requestId}] Received ICE candidate for request ${reqId}`);
      
      if (reqId === requestId) {
        if (candidate) {
          console.log('✅ ICE candidate matches our request, adding...');
          try {
            if (!peerConnectionRef.current) {
              console.error('❌ Peer connection not initialized!');
              return;
            }
            
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ ICE candidate added successfully');
          } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
            console.error('Error details:', error.message);
          }
        } else {
          console.log('⚠️ Received empty ICE candidate (end of candidates)');
        }
      } else {
        console.log(`⚠️ ICE candidate for different request (got ${reqId}, expected ${requestId})`);
      }
    });

    socket.on('webrtc:end-call', ({ requestId: reqId }) => {
      console.log(`📴 [REQUEST ${requestId}] Received end-call for request ${reqId}`);
      if (reqId === requestId) {
        console.log('✅ End-call matches our request');
        handleCallEnd();
      }
    });
    
    console.log('✅ All socket listeners registered');
  };

  const createOffer = async () => {
    try {
      console.log('📤 Creating WebRTC offer...');
      console.log(`📋 Offer details: to=${remoteUserId}, requestId=${requestId}`);
      
      if (!peerConnectionRef.current) {
        console.error('❌ Cannot create offer: Peer connection not initialized!');
        return;
      }
      
      const offer = await peerConnectionRef.current.createOffer();
      console.log('📝 Offer created:', { hasOffer: !!offer, hasSDP: !!offer?.sdp });
      
      await peerConnectionRef.current.setLocalDescription(offer);
      console.log('✅ Local description set, sending offer via socket...');
      
      socket.emit('webrtc:offer', {
        to: remoteUserId,
        offer,
        requestId
      });
      console.log(`✅ Offer emitted to socket for user ${remoteUserId}, request ${requestId}`);
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      console.error('Error details:', error.message);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleCallEnd = () => {
    console.log('📴 Ending call for request', requestId);
    
    if (remoteUserId) {
      socket.emit('webrtc:end-call', {
        to: remoteUserId,
        requestId
      });
      console.log('✅ End-call signal sent to user', remoteUserId);
    } else {
      console.warn('⚠️ Cannot send end-call signal: remoteUserId is undefined');
    }
    
    cleanup();
    if (onCallEnd) {
      onCallEnd();
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Remove socket listeners
    socket.off('webrtc:offer');
    socket.off('webrtc:answer');
    socket.off('webrtc:ice-candidate');
    socket.off('webrtc:end-call');
  };

  return (
    <div className="video-call-container">
      {(!socket || !requestId || !localUserId || !remoteUserId) ? (
        <div className="video-call-error">
          <h3>❌ Video Call Error</h3>
          <p>Missing required connection parameters. Please try again.</p>
          <ul>
            {!socket && <li>Socket connection missing</li>}
            {!requestId && <li>Request ID missing</li>}
            {!localUserId && <li>Local user ID missing</li>}
            {!remoteUserId && <li>Remote user ID missing</li>}
          </ul>
          {onCallEnd && <button onClick={onCallEnd}>Close</button>}
        </div>
      ) : (
      <>
        <div className="video-grid">
          <div className="video-wrapper remote-video-wrapper">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video"
            />
            {isConnecting && (
              <div className="connecting-overlay">
                <div className="spinner"></div>
                <p>Connecting...</p>
              </div>
            )}
            {!isConnected && !isConnecting && (
              <div className="waiting-overlay">
                <p>Waiting for peer to join...</p>
              </div>
            )}
          </div>

          <div className="video-wrapper local-video-wrapper">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="local-video"
            />
            <div className="local-video-label">You</div>
          </div>
        </div>

        <div className="video-controls">
          <button 
            onClick={toggleMute} 
            className={`control-btn ${isMuted ? 'active' : ''}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>

          <button 
            onClick={toggleVideo} 
            className={`control-btn ${isVideoOff ? 'active' : ''}`}
            title={isVideoOff ? 'Turn on video' : 'Turn off video'}
          >
            {isVideoOff ? '📹' : '📷'}
          </button>

          <button 
            onClick={handleCallEnd} 
            className="control-btn end-call-btn"
            title="End call"
          >
            📞 End Call
          </button>
        </div>
      </>
      )}
    </div>
  );
};

export default VideoCall;
