// Session management using device fingerprinting
// This creates unique session IDs for each device/browser combination
// without requiring login/signup

interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  canvasFingerprint: string;
  webglFingerprint: string;
}

class SessionManager {
  private static instance: SessionManager;
  private sessionId: string | null = null;

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Generate a device fingerprint
  private async generateDeviceFingerprint(): Promise<DeviceFingerprint> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create a unique canvas fingerprint
    ctx!.fillStyle = 'rgb(102, 204, 0)';
    ctx!.fillRect(0, 0, 10, 10);
    ctx!.fillStyle = 'rgb(255, 0, 255)';
    ctx!.fillRect(2, 2, 6, 6);
    const canvasFingerprint = canvas.toDataURL();

    // Create WebGL fingerprint
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    let webglFingerprint = '';
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        webglFingerprint = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }

    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      canvasFingerprint,
      webglFingerprint
    };
  }

  // Generate a hash from the device fingerprint
  private async hashFingerprint(fingerprint: DeviceFingerprint): Promise<string> {
    const fingerprintString = JSON.stringify(fingerprint);
    
    // Use a simple hash function (in production, you might want to use a more robust one)
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Add some randomness to make it more unique
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${Math.abs(hash).toString(36)}_${randomSuffix}`;
  }

  // Get or create session ID
  public async getSessionId(): Promise<string> {
    // Try to get from localStorage first
    const storedSessionId = localStorage.getItem('multiagent_session_id');
    if (storedSessionId) {
      this.sessionId = storedSessionId;
      return this.sessionId;
    }

    // If we have a session ID in memory, use it
    if (this.sessionId) {
      return this.sessionId;
    }

    // Generate new session ID
    try {
      const fingerprint = await this.generateDeviceFingerprint();
      const sessionId = await this.hashFingerprint(fingerprint);
      
      // Store in localStorage
      localStorage.setItem('multiagent_session_id', sessionId);
      this.sessionId = sessionId;
      
      console.log('Generated new session ID:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('Error generating session ID:', error);
      // Fallback to a simple random ID
      const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('multiagent_session_id', fallbackId);
      this.sessionId = fallbackId;
      return fallbackId;
    }
  }

  // Clear session (useful for testing or resetting)
  public clearSession(): void {
    this.sessionId = null;
    localStorage.removeItem('multiagent_session_id');
  }

  // Clear session and participant ID (for complete reset)
  public clearAll(): void {
    this.sessionId = null;
    localStorage.removeItem('multiagent_session_id');
    localStorage.removeItem('multiagent_participant_id');
  }

  // Clear only session ID but keep participant ID (for restarting game with same participant)
  public clearSessionOnly(): void {
    this.sessionId = null;
    localStorage.removeItem('multiagent_session_id');
  }

  // Get session info for debugging
  public getSessionInfo(): { sessionId: string | null; stored: boolean; participantId: string | null } {
    const stored = localStorage.getItem('multiagent_session_id') !== null;
    const participantId = localStorage.getItem('multiagent_participant_id');
    return { sessionId: this.sessionId, stored, participantId };
  }

  // Get participant ID
  public getParticipantId(): string | null {
    return localStorage.getItem('multiagent_participant_id');
  }

  // Set participant ID
  public setParticipantId(participantId: string): void {
    localStorage.setItem('multiagent_participant_id', participantId);
  }

  // Clear participant ID
  public clearParticipantId(): void {
    localStorage.removeItem('multiagent_participant_id');
  }
}

export const sessionManager = SessionManager.getInstance(); 