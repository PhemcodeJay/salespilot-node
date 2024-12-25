const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const moment = require('moment');

// MySQL connection configuration
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your-password',
  database: 'salespilot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper function to send activation email
const sendActivationEmail = async (email, activationCode) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-email-password',
    },
  });

  const activationLink = `http://your-website.com/activate?code=${activationCode}`;
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'Activate Your Account',
    text: `Please click the following link to activate your account: ${activationLink}`,
  };

  await transporter.sendMail(mailOptions);
};

// Helper function to generate random string (for activation code, reset code, etc.)
const generateRandomCode = () => crypto.randomBytes(20).toString('hex');

// Signup function
const signup = async (userData) => {
  const { username, email, password, confirmpassword, phone, location, user_image } = userData;

  // Check if passwords match
  if (password !== confirmpassword) {
    throw new Error('Passwords do not match');
  }

  // Check if the user already exists
  const [existingUser] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);
  if (existingUser.length > 0) {
    throw new Error('User already exists');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the user in the database
  const [result] = await pool.promise().query(
    'INSERT INTO users (username, email, password, confirmpassword, phone, location, user_image, status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [username, email, hashedPassword, hashedPassword, phone, location, user_image, 1, 0]
  );

  // Get the inserted user's ID
  const userId = result.insertId;

  // Generate and save activation code
  const activationCode = generateRandomCode();
  await pool.promise().query(
    'INSERT INTO activation_codes (user_id, activation_code, expires_at) VALUES (?, ?, ?)',
    [userId, activationCode, moment().add(1, 'day').toDate()]
  );

  // Send activation email
  await sendActivationEmail(email, activationCode);

  // Add the free trial subscription for the user
  await pool.promise().query(
    'INSERT INTO subscriptions (user_id, subscription_plan, start_date, end_date, status, is_free_trial_used) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, 'trial', moment().toDate(), moment().add(3, 'months').toDate(), 'active', 1]
  );

  return { id: userId, username, email }; // Return user details
};

// Email Activation function
const activateUser = async (activationCode) => {
  const [code] = await pool.promise().query('SELECT * FROM activation_codes WHERE activation_code = ?', [activationCode]);

  if (code.length === 0) {
    throw new Error('Invalid or expired activation code');
  }

  if (moment(code[0].expires_at).isBefore(moment())) {
    throw new Error('Activation code has expired');
  }

  // Activate user
  const userId = code[0].user_id;
  const [user] = await pool.promise().query('SELECT * FROM users WHERE id = ?', [userId]);

  if (user.length === 0 || user[0].is_active === 1) {
    throw new Error('User already activated or not found');
  }

  // Set user as active
  await pool.promise().query('UPDATE users SET is_active = 1 WHERE id = ?', [userId]);

  // Delete the activation code
  await pool.promise().query('DELETE FROM activation_codes WHERE id = ?', [code[0].id]);

  return user[0]; // Return the activated user
};

// Login function
const login = async (email, password) => {
  const [user] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);

  if (user.length === 0 || user[0].is_active === 0) {
    throw new Error('User not found or not activated');
  }

  const isMatch = await bcrypt.compare(password, user[0].password);
  if (!isMatch) {
    throw new Error('Incorrect password');
  }

  return user[0]; // Return user details after successful login
};

// Logout function (destroy session if using sessions or JWT)
const logout = (req, res) => {
  req.session.destroy(); // or any other session management you are using
  res.clearCookie('auth_token');
  res.redirect('/login');
};

// Password Reset Request function
const requestPasswordReset = async (email) => {
  const [user] = await pool.promise().query('SELECT * FROM users WHERE email = ?', [email]);

  if (user.length === 0) {
    throw new Error('User not found');
  }

  const resetCode = generateRandomCode();
  const expiresAt = moment().add(1, 'hour').toDate(); // expires in 1 hour

  await pool.promise().query(
    'INSERT INTO password_resets (user_id, reset_code, expires_at) VALUES (?, ?, ?)',
    [user[0].id, resetCode, expiresAt]
  );

  // Send reset link to user
  const resetLink = `http://your-website.com/reset-password?code=${resetCode}`;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-email-password',
    },
  });

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'Password Reset Request',
    text: `Please click the following link to reset your password: ${resetLink}`,
  };

  await transporter.sendMail(mailOptions);
};

// Reset Password function
const resetPassword = async (resetCode, newPassword) => {
  const [reset] = await pool.promise().query('SELECT * FROM password_resets WHERE reset_code = ?', [resetCode]);

  if (reset.length === 0) {
    throw new Error('Invalid or expired reset code');
  }

  if (moment(reset[0].expires_at).isBefore(moment())) {
    throw new Error('Reset code has expired');
  }

  const [user] = await pool.promise().query('SELECT * FROM users WHERE id = ?', [reset[0].user_id]);

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.promise().query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user[0].id]);

  // Delete the reset code
  await pool.promise().query('DELETE FROM password_resets WHERE id = ?', [reset[0].id]);

  return user[0]; // Return the updated user
};

module.exports = {
  signup,
  activateUser,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
};
