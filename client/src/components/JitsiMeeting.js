import React, { useEffect, useRef } from 'react';
import axios from 'axios';

const JitsiMeeting = ({ sessionId, tutorName, learnerName, onSessionEnded }) => {
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const sessionCompletedRef = useRef(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;

    script.onload = () => {
      if (!window.JitsiMeetExternalAPI) {
        console.error('JitsiMeetExternalAPI not available');
        return;
      }

      const options = {
        roomName: `peer-${sessionId}`,
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          disableSimulcast: false,
        },
        interfaceConfigOverwrite: {
          DEFAULT_BACKGROUND: '#000000',
          HIDE_INVITE_MORE_HEADER: true,
        },
        userInfo: {
          displayName: learnerName || 'Student',
        },
      };

      try {
        const api = new window.JitsiMeetExternalAPI('meet.jit.si', options);
        jitsiApiRef.current = api;

        // Listen for when conference is left.
        api.addEventListener('videoConferenceLeft', async () => {
          console.log('✅ JitsiMeeting: Conference ended');

          if (sessionCompletedRef.current) {
            return;
          }
          sessionCompletedRef.current = true;

          try {
            await axios.put(`/request/${sessionId}/complete`);
            console.log('✅ JitsiMeeting: Session marked as complete on server');

            if (onSessionEnded) {
              onSessionEnded();
            }
          } catch (error) {
            console.error('❌ JitsiMeeting: Error completing session:', error);
          }
        });
      } catch (error) {
        console.error('❌ JitsiMeeting: Error initializing Jitsi:', error);
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi API:', error);
        }
      }
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    };
  }, [sessionId, learnerName, onSessionEnded]);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <div
        ref={jitsiContainerRef}
        style={{
          width: '100%',
          height: '100%',
          border: '2px solid #007bff',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />
    </div>
  );
};

export default JitsiMeeting;
