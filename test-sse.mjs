import * as jose from 'jose';
import https from 'http';

async function test() {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new jose.SignJWT({ userId: '06668eb0-3a2b-485d-930a-f147f9e6e21c', email: 'test1@gmail.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1d')
    .sign(secret);

  const docId = '0aa0e355-0cdf-49d8-85d3-1fe6e0f301c2';

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/sync/stream?documentId=${docId}&clientId=test-client-123&lastSync=${Date.now() - 600000}`,
    headers: {
      'Cookie': `session=${token}`
    }
  };

  console.log('Connecting...');
  https.get(options, (res) => {
    console.log('Status:', res.statusCode);
    res.on('data', (d) => {
      console.log('Data:', d.toString());
      if (d.toString().includes('sync')) process.exit(0);
    });
  }).on('error', (e) => {
    console.error(e);
  });
}
test();
