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

        // Listen for when conference is left
        api.addEventListeners({
          onConferenceLeft: async () => {
            console.log('✅ JitsiMeeting: Conference ended');
            
            // Prevent duplicate submission
            if (sessionCompletedRef.current) {
              console.log('⏭️ JitsiMeeting: Session already marked as completed');
              return;
            }
            sessionCompletedRef.current = true;

            try {
              // Auto-complete the session on backend
              await axios.put(`/request/${sessionId}/complete`);
              console.log('✅ JitsiMeeting: Session marked as complete on server');

              // Notify parent component
              if (onSessionEnded) {
                onSessionEnded();
              }

              // Auto-request review for learner
              setTimeout(async () => {
                try {
                  const response = await axios.get(`/learning/sessions/${sessionId}`);
                  const session = response.data;
                  
                  if (session && session.learner) {
                    console.log('📨 JitsiMeeting: Triggering automatic review request');
                    // The backend will automatically send review request notification
                    alert('📋 Session completed! Review has been requested from the learner.');
                  }
                } catch (err) {
                  console.error('Error fetching session:', err);
                }
              }, 500);
            } catch (error) {
              console.error('❌ JitsiMeeting: Error completing session:', error);
              alert('Error completing session. Please try again.');
            }
          },
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
