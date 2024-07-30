const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

const userDataPath = './userData.json';

// Helper function to read user data from the file
const readUserData = () => {
  if (!fs.existsSync(userDataPath)) {
    return {};
  }
  const data = fs.readFileSync(userDataPath);
  const parsedData = JSON.parse(data);

  // Ensure that each user has a sessions array
  Object.keys(parsedData).forEach(userId => {
    if (!Array.isArray(parsedData[userId].sessions)) {
      parsedData[userId].sessions = [];
    }
  });

  return parsedData;
};

// Helper function to write user data to the file
const writeUserData = (data) => {
  fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
};

// Endpoint for user login
app.post('/login', (req, res) => {
  const { userId, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  console.log('Login request received with userId:', userId, 'password:', password, 'IP:', ip);

  if (userId === '123456' && password === '1234') {
    const userData = readUserData();
    console.log('User data read from file:', userData);

    if (!userData[userId]) {
      userData[userId] = { sessions: [] };
    }

    const loginTime = new Date().toISOString();
    userData[userId].sessions.push({
      loginTime,
      logoutTime: null,
      distance: 0,
      date: loginTime.split('T')[0],
      ip
    });

    writeUserData(userData);
    console.log('User data updated with new session:', userData);

    res.json({ success: true });
  } else {
    console.log('Invalid login attempt for userId:', userId);
    res.json({ success: false });
  }
});

// Endpoint for user logout
app.post('/logout', (req, res) => {
  const { userId } = req.body;
  console.log('Logout request received with userId:', userId);
  const userData = readUserData();

  if (userData[userId] && Array.isArray(userData[userId].sessions) && userData[userId].sessions.length > 0) {
    const lastSession = userData[userId].sessions[userData[userId].sessions.length - 1];
    if (lastSession.logoutTime === null) {
      lastSession.logoutTime = new Date().toISOString();
      writeUserData(userData);
      console.log('User session updated with logout time:', userData);

      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'User already logged out' });
    }
  } else {
    res.json({ success: false, message: 'No active session found' });
  }
});

// Endpoint to track distance
app.post('/track', (req, res) => {
  const { userId, distance } = req.body;
  console.log('Track request received with userId:', userId, 'distance:', distance);
  const userData = readUserData();

  if (userData[userId] && Array.isArray(userData[userId].sessions) && userData[userId].sessions.length > 0) {
    const lastSession = userData[userId].sessions[userData[userId].sessions.length - 1];
    if (lastSession.logoutTime === null) {
      lastSession.distance += distance;
      writeUserData(userData);
      console.log('User session updated with new distance:', userData);

      res.json({ success: true, totalDistance: lastSession.distance });
    } else {
      res.json({ success: false, message: 'Session has already ended' });
    }
  } else {
    res.json({ success: false, message: 'No active session found' });
  }
});

// Endpoint to get tracking data
app.get('/track/:userId', (req, res) => {
  const { userId } = req.params;
  console.log('Get tracking data request received for userId:', userId);
  const userData = readUserData();

  if (userData[userId] && Array.isArray(userData[userId].sessions)) {
    res.json(userData[userId].sessions);
  } else {
    res.json([]);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
