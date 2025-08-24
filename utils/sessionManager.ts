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
  private participantId: string | null = null;
  private sessionId: string | null = null;

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Generate a per-game session ID
  private generateSessionId(): string {
    const randomPart = Math.random().toString(36).substring(2, 10);
    const timePart = Date.now().toString(36);
    return `sess_${timePart}_${randomPart}`;
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

  // Get or create participant ID
  public async getParticipantId(): Promise<string> {
    // If we have a participant ID in memory, use it 
    if (this.participantId) {
      return this.participantId;
    }

    // Only use localStorage if we're in a browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      // Try to get from localStorage
      const storedParticipantId = localStorage.getItem('multiagent_participant_id');
      if (storedParticipantId) {
        this.participantId = storedParticipantId;
        return this.participantId;
      }
    }

    // Generate new participant ID
    try {
      const fingerprint = await this.generateDeviceFingerprint();
      const participantId = await this.hashFingerprint(fingerprint);
      
      // Store in localStorage if available
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('multiagent_participant_id', participantId);
      }
      this.participantId = participantId;
      return participantId;
    } catch (error) {
      console.error('Error generating participant ID:', error);
      const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('multiagent_participant_id', fallbackId);
      }
      this.participantId = fallbackId;
      return fallbackId;
    }
  }

  // Clear participant ID (useful for testing or resetting)
  public clearParticipant(): void {
    this.participantId = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('multiagent_participant_id');
    }
  }

  // Clear all data (for complete reset)
  public clearAll(): void {
    this.participantId = null;
    this.sessionId = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('multiagent_participant_id');
      localStorage.removeItem('multiagent_session_id');
    }
  }

  // Get participant info for debugging
  public getParticipantInfo(): { participantId: string | null; stored: boolean } {
    const stored = typeof window !== 'undefined' && window.localStorage ? 
      localStorage.getItem('multiagent_participant_id') !== null : false;
    
    // If we have a stored participant ID but not in memory, load it
    if (stored && !this.participantId) {
      this.participantId = localStorage.getItem('multiagent_participant_id');
    }
    
    return { participantId: this.participantId, stored };
  }

  // Set participant ID
  public setParticipantId(participantId: string): void {
    this.participantId = participantId;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('multiagent_participant_id', participantId);
    }
  }

  // Clear participant ID
  public clearParticipantId(): void {
    this.participantId = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('multiagent_participant_id');
    }
  }

  // Compatibility method - returns participant ID as session ID
  public async getSessionId(): Promise<string> {
    // Prefer in-memory session
    if (this.sessionId) {
      return this.sessionId;
    }

    // Try to load from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('multiagent_session_id');
      if (stored) {
        this.sessionId = stored;
        return stored;
      }
    }

    // Create a new session ID
    const newSessionId = this.generateSessionId();
    this.sessionId = newSessionId;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('multiagent_session_id', newSessionId);
    }
    return newSessionId;
  }

  // Clear only the current session (keep participant stable across games)
  public clearSessionOnly(): void {
    this.sessionId = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('multiagent_session_id');
    }
  }

  // Compatibility method - get session info
  public getSessionInfo(): { sessionId: string | null; stored: boolean; participantId: string | null } {
    const participantInfo = this.getParticipantInfo();
    let currentSessionId = this.sessionId;
    if (!currentSessionId && typeof window !== 'undefined' && window.localStorage) {
      currentSessionId = localStorage.getItem('multiagent_session_id');
    }
    return {
      sessionId: currentSessionId,
      stored: participantInfo.stored,
      participantId: participantInfo.participantId
    };
  }
}

export const sessionManager = SessionManager.getInstance(); 