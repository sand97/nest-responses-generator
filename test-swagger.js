const https = require('http');

function testSwagger() {
  console.log('🔍 Testing Swagger documentation...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/docs-json',
    method: 'GET'
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const swagger = JSON.parse(data);
        console.log('✅ Swagger JSON loaded successfully');
        
        // Check if we have paths
        if (swagger.paths) {
          console.log(`📄 Found ${Object.keys(swagger.paths).length} API paths`);
          
          // Check users endpoints
          if (swagger.paths['/users']) {
            console.log('👥 Users endpoints found:');
            Object.keys(swagger.paths['/users']).forEach(method => {
              const endpoint = swagger.paths['/users'][method];
              console.log(`  ${method.toUpperCase()}: ${endpoint.summary || 'No summary'}`);
              
              if (endpoint.responses && endpoint.responses['200']) {
                const response = endpoint.responses['200'];
                console.log(`    Response: ${response.description}`);
                if (response.content && response.content['application/json']) {
                  const schema = response.content['application/json'].schema;
                  if (schema) {
                    console.log(`    Schema: ${JSON.stringify(schema, null, 2)}`);
                  }
                }
              }
            });
          }
        }
        
        console.log('\n🎉 Swagger documentation is working!');
        console.log('📚 Visit http://localhost:3000/docs to view the UI');
        
        process.exit(0);
      } catch (error) {
        console.error('❌ Failed to parse Swagger JSON:', error.message);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Failed to connect to application:', error.message);
    console.log('💡 Make sure the application is running on port 3000');
    process.exit(1);
  });

  req.end();
}

// Wait a bit for the application to start, then test
setTimeout(testSwagger, 5000);
