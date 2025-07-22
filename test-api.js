// Test script for OrthoIQ API endpoints
async function testAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Testing OrthoIQ API endpoints...\n');
  
  // Test 1: Health endpoint
  console.log('1. Testing /api/health endpoint:');
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    console.log(`   Status: ${healthRes.status} ${healthRes.statusText}`);
    console.log(`   Overall Health: ${healthData.status}`);
    console.log(`   Environment: ${healthData.checks.environment.status}`);
    console.log(`   Database: ${healthData.checks.database.status}`);
    console.log(`   Claude API: ${healthData.checks.claude.status}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n2. Testing /api/claude endpoint:');
  try {
    // Test valid request
    const claudeRes = await fetch(`${baseUrl}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What is the best treatment for a mild ankle sprain?',
        fid: 'test-user-123'
      })
    });
    
    // Check content type before parsing
    const contentType = claudeRes.headers.get('content-type');
    console.log(`   Status: ${claudeRes.status} ${claudeRes.statusText}`);
    console.log(`   Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      const claudeData = await claudeRes.json();
      if (claudeRes.ok) {
        console.log(`   Response received: ${claudeData.response ? 'Yes' : 'No'}`);
        console.log(`   Confidence: ${claudeData.confidence || 'N/A'}`);
        console.log(`   Is Filtered: ${claudeData.isFiltered}`);
      } else {
        console.log(`   Error: ${claudeData.error}`);
        console.log(`   Details: ${claudeData.details || 'N/A'}`);
      }
    } else {
      const text = await claudeRes.text();
      console.log(`   Non-JSON Response: ${text.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n3. Testing /frames endpoint:');
  try {
    const framesRes = await fetch(`${baseUrl}/frames`);
    console.log(`   Status: ${framesRes.status} ${framesRes.statusText}`);
    console.log(`   Content-Type: ${framesRes.headers.get('content-type')}`);
    const text = await framesRes.text();
    console.log(`   Response includes frame HTML: ${text.includes('fc:frame') ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n4. Testing error handling (invalid JSON):');
  try {
    const errorRes = await fetch(`${baseUrl}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json'
    });
    
    const contentType = errorRes.headers.get('content-type');
    console.log(`   Status: ${errorRes.status} ${errorRes.statusText}`);
    
    if (contentType && contentType.includes('application/json')) {
      const errorData = await errorRes.json();
      console.log(`   Error handled correctly: ${errorData.error ? 'Yes' : 'No'}`);
      console.log(`   Error message: ${errorData.error}`);
    } else {
      const text = await errorRes.text();
      console.log(`   Non-JSON Error: ${text}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n5. Testing rate limiting:');
  try {
    // Make two requests with the same FID
    const fid = 'rate-limit-test-' + Date.now();
    
    const req1 = await fetch(`${baseUrl}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'First question',
        fid: fid
      })
    });
    console.log(`   First request: ${req1.status} ${req1.statusText}`);
    
    const req2 = await fetch(`${baseUrl}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Second question',
        fid: fid
      })
    });
    console.log(`   Second request: ${req2.status} ${req2.statusText}`);
    
    if (req2.status === 429) {
      const data = await req2.json();
      console.log(`   Rate limit working correctly: ${data.error}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n✅ API testing complete!');
}

// Run the tests
console.log('Starting OrthoIQ API tests...');
console.log('Make sure the Next.js dev server is running on port 3000\n');

testAPI().catch(console.error);