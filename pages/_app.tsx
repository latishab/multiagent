import type { AppProps } from 'next/app'
import Script from 'next/script'
import { useEffect } from 'react'
import { sessionManager } from '../utils/sessionManager'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const setupClarityIdentity = async () => {
      try {
        const [sessionId, participantId] = await Promise.all([
          sessionManager.getSessionId(),
          sessionManager.getParticipantId(),
        ]);

        const friendlyName = `participant:${participantId} | session:${sessionId}`;

        if (typeof window !== 'undefined' && typeof (window as any).clarity === 'function') {
          (window as any).clarity('set', 'sessionId', sessionId);
          (window as any).clarity('set', 'participantId', participantId);
          (window as any).clarity('identify', undefined, undefined, undefined, friendlyName);
          (window as any).clarity('event', 'identity_set');
        } else if (typeof window !== 'undefined') {
          (window as any).clarity = (window as any).clarity || function() {
            ((window as any).clarity.q = (window as any).clarity.q || []).push(arguments);
          };
          (window as any).clarity('set', 'sessionId', sessionId);
          (window as any).clarity('set', 'participantId', participantId);
          (window as any).clarity('identify', undefined, undefined, undefined, friendlyName);
          (window as any).clarity('event', 'identity_set');
        }
      } catch {
        // no-op
      }
    };

    setupClarityIdentity();

    const onParticipantChanged = () => {
      setupClarityIdentity();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('participant-id-changed', onParticipantChanged as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('participant-id-changed', onParticipantChanged as EventListener);
      }
    };
  }, []);

  return (
    <>
      <Script id="ms-clarity" strategy="afterInteractive">
        {`(function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "srjbk2klo8");`}
      </Script>
      <Component {...pageProps} />
    </>
  )
}