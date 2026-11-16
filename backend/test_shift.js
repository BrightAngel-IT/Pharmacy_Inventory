

async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'cashier', password: 'cashier123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    console.log('Login token:', token ? 'Success' : 'Failed');

    const openRes = await fetch('http://localhost:5000/api/shifts/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ startTime: new Date().toISOString() })
    });
    console.log('Open Shift:', await openRes.text());

    const curRes = await fetch('http://localhost:5000/api/shifts/current', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    console.log('Current Shift:', await curRes.text());

  } catch (err) {
    console.error(err);
  }
}
test();
