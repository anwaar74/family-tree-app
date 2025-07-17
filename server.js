const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const nodemailer = require('nodemailer');
const PORT = 4000;

app.use(bodyParser.json());
app.use(cors());

// Local file as our "database"
const USERS_FILE = 'users.json';

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Setup nodemailer (use Gmail App Password or Mailtrap for dev)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'anwaar.lukman@gmail.com',       // CHANGE THIS
    pass: 'pggu vxba wnua hhby'      // CHANGE THIS: App password, NOT Gmail password!
  }
});

// 1. Registration route
app.post('/register', (req, res) => {
  const { username, email, password, fullName } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ msg: 'Missing fields' });
  }
  let users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ msg: 'Username already exists' });
  }
  users.push({
    username,
    email,
    password,
    fullName,
    approved: false,
    status: "Pending"
  });
  saveUsers(users);
  res.json({ msg: 'Registration submitted. Await approval by admin.' });
});

// 2. Admin approval (visit http://localhost:4000/approve/:username)
app.get('/approve/:username', (req, res) => {
  let users = loadUsers();
  const idx = users.findIndex(u => u.username === req.params.username);
  if (idx === -1) return res.status(404).send('User not found');
  if (users[idx].status === "Approved") return res.send('Already approved.');

  users[idx].approved = true;
  users[idx].status = "Approved";
  saveUsers(users);

  // Send APPROVAL email
  transporter.sendMail({
    from: '"Family Tree Admin" <your_gmail@gmail.com>', // CHANGE THIS!
    to: users[idx].email,
    subject: 'Your Family Tree Account Approved',
    text: `Hello ${users[idx].fullName || users[idx].username},

Your account has been approved!

Login at http://localhost:3000/login.html with:
Username: ${users[idx].username}
Password: ${users[idx].password}

You may now access the app.

- Admin`
  }, (err, info) => {
    if (err) {
      return res.send('User approved but failed to send email: ' + err.message);
    }
    res.send('User approved and email sent!');
  });
});

// 3. Admin rejection (visit http://localhost:4000/reject/:username)
app.get('/reject/:username', (req, res) => {
  let users = loadUsers();
  const idx = users.findIndex(u => u.username === req.params.username);
  if (idx === -1) return res.status(404).send('User not found');
  if (users[idx].status === "Approved") return res.send('Already approved; cannot reject.');

  users[idx].approved = false;
  users[idx].status = "Rejected";
  saveUsers(users);

  // Send REJECTION email
  transporter.sendMail({
    from: '"Family Tree Admin" <your_gmail@gmail.com>', // CHANGE THIS!
    to: users[idx].email,
    subject: 'Your Family Tree Registration Was Rejected',
    text: `Hello ${users[idx].fullName || users[idx].username},

Unfortunately, your registration for the Family Tree app has been rejected.

If you believe this is a mistake, please contact the administrator.

- Admin`
  }, (err, info) => {
    if (err) {
      return res.send('User rejected but failed to send email: ' + err.message);
    }
    res.send('User rejected and email sent!');
  });
});

// 4. Login API
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  let users = loadUsers();
  console.log("Login request:", username, password);
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    console.log("No user found or password mismatch.");
    return res.status(401).json({ msg: 'Invalid credentials' });
  }
  if (user.status !== "Approved") {
    console.log("User not approved:", username);
    return res.status(403).json({ msg: 'Account not approved yet' });
  }
  console.log("Login successful:", username);
  res.json({ msg: 'Login successful' });
});

// 5. List all users (admin panel)
app.get('/users', (req, res) => {
  res.json(loadUsers());
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
