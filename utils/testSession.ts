// Test utility for session management
// This can be used to verify that sessions are working correctly

import { sessionManager } from './sessionManager';

export async function testSessionManagement() {
  console.log('Testing session management...');
  
  // Test 1: Get session ID
  const sessionId1 = await sessionManager.getSessionId();
  console.log('Session ID 1:', sessionId1);
  
  // Test 2: Get session ID again (should be the same)
  const sessionId2 = await sessionManager.getSessionId();
  console.log('Session ID 2:', sessionId2);
  console.log('Sessions match:', sessionId1 === sessionId2);
  
  // Test 3: Get session info
  const sessionInfo = sessionManager.getSessionInfo();
  console.log('Session info:', sessionInfo);
  
  // Test 4: Clear session and get new one
  sessionManager.clearSession();
  const sessionId3 = await sessionManager.getSessionId();
  console.log('Session ID 3 (after clear):', sessionId3);
  console.log('New session different:', sessionId1 !== sessionId3);
  
  return {
    originalSession: sessionId1,
    newSession: sessionId3,
    sessionsMatch: sessionId1 === sessionId2,
    newSessionDifferent: sessionId1 !== sessionId3
  };
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testSessionManagement = testSessionManagement;
} 