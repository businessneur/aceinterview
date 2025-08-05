// LiveKit Configuration Test Utility
import { VoiceInterviewService } from '../services/voiceInterviewService';
import { APIService } from '../services/apiService';

export const testLiveKitConfiguration = async (): Promise<void> => {
  console.log('🧪 Testing LiveKit Configuration...');
  console.log('=' .repeat(50));
  
  // Test 1: Check API Base URL
  console.log('1️⃣ API Configuration:');
  console.log(`   Base URL: ${APIService.getBaseURL()}`);
  console.log(`   Environment: ${import.meta.env.MODE}`);
  console.log(`   Development: ${import.meta.env.DEV}`);
  
  // Test 2: Backend Health Check
  console.log('\n2️⃣ Backend Health Check:');
  try {
    const isHealthy = await APIService.checkHealth();
    console.log(`   Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  } catch (error) {
    console.log(`   Status: ❌ Error - ${error}`);
  }
  
  // Test 3: LiveKit Configuration Check
  console.log('\n3️⃣ LiveKit Configuration:');
  try {
    const config = await VoiceInterviewService.checkLiveKitConfig();
    console.log(`   Configured: ${config.configured ? '✅ Yes' : '❌ No'}`);
    console.log(`   WebSocket URL: ${config.wsUrl || 'Not provided'}`);
    console.log(`   AI Agent: ${config.aiAgent ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`   Timestamp: ${config.timestamp || 'Not provided'}`);
  } catch (error) {
    console.log(`   Error: ❌ ${error}`);
  }
  
  console.log('=' .repeat(50));
  console.log('🏁 LiveKit Configuration Test Complete');
};

// Export for use in browser console
(window as any).testLiveKitConfiguration = testLiveKitConfiguration;