import React, { useEffect, useRef } from 'react';
import axios from 'axios';

const JitsiMeeting = ({ sessionId, tutorName, learnerName, onSessionEnded }) => {
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const sessionCompletedRef = useRef(false);
  const onSessionEndedRef = useRef(onSessionEnded);

  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded;
  }, [onSessionEnded]);

  useEffect(() => {
    sessionCompletedRef.current = false;

    const initializeMeeting = () => {
      if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) {
        return;
      }

      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing previous Jitsi instance:', error);
        }
        jitsiApiRef.current = null;
      }

      jitsiContainerRef.current.innerHTML = '';

      const options = {
        roomName: `peer-${sessionId}`,
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          disableSimulcast: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true
        },
        interfaceConfigOverwrite: {
          DEFAULT_BACKGROUND: '#000000',
          HIDE_INVITE_MORE_HEADER: true
        },
        userInfo: {
          displayName: tutorName || learnerName || 'Peer User'
        }
      };

      try {
        const api = new window.JitsiMeetExternalAPI('meet.jit.si', options);
        jitsiApiRef.current = api;

        api.addEventListener('videoConferenceLeft', async () => {
          console.log('✅ JitsiMeeting: Conference ended');

          if (sessionCompletedRef.current) {
            return;
          }
          sessionCompletedRef.current = true;

          try {
            await axios.put(`/request/${sessionId}/complete`);
            console.log('✅ JitsiMeeting: Session marked as complete on server');

            if (onSessionEndedRef.current) {
              onSessionEndedRef.current();
            }
          } catch (error) {
            console.error('❌ JitsiMeeting: Error completing session:', error);
          }
        });
      } catch (error) {
        console.error('❌ JitsiMeeting: Error initializing Jitsi:', error);
      }
    };

    if (window.JitsiMeetExternalAPI) {
      initializeMeeting();
    } else {
      const existingScript = document.querySelector('script[src="https://meet.jit.si/external_api.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', initializeMeeting, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.addEventListener('load', initializeMeeting, { once: true });
        document.head.appendChild(script);
      }
    }

    return () => {
      // Cleanup
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi API:', error);
        }
        jitsiApiRef.current = null;
      }
    };
  }, [sessionId, learnerName, tutorName]);

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
