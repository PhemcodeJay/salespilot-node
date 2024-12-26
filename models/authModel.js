require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const moment = require('moment');
const validator = require('validator');

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'salespilot',
  waitForConnections: true,
  connectionLimit: 10,
});

// Email transporter configuration
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'ionos',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// Utility function to send activation emails
const sendActivationEmail = async (email, activationCode) => {
  const transporter = createTransporter();
  const activationLink = `${process.env.APP_URL}/activate?code=${activationCode}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Activate Your Account',
    text: `Click the link to activate your account: ${activationLink}`,
  };
  await transporter.sendMail(mailOptions);
};

// Generate a random code
const generateRandomCode = () => crypto.randomBytes(20).toString('hex');

// Signup function
const signup = async (userData) => {
  const { username, email, password, confirmpassword } = userData;

  // Validate inputs
  if (password !== confirmpassword) throw new Error('Passwords do not match');
  if (!validator.isEmail(email)) throw new Error('Invalid email format');

  // Check if user already exists
  const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (existingUser.length > 0) throw new Error('User already exists');

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert user into the database
  const [result] = await pool.query(
    'INSERT INTO users (username, email, password, status, is_active) VALUES (?, ?, ?, ?, ?)',
    [username, email, hashedPassword, 1, 0]
  );
  const userId = result.insertId;

  // Generate and store activation code
  const activationCode = generateRandomCode();
  await pool.query(
    'INSERT INTO activation_codes (user_id, activation_code, expires_at) VALUES (?, ?, ?)',
    [userId, activationCode, moment().add(1, 'day').toDate()]
  );

  // Send activation email
  await sendActivationEmail(email, activationCode);

  // Add trial subscription
  await pool.query(
    'INSERT INTO subscriptions (user_id, subscription_plan, start_date, end_date, status, is_free_trial_used) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, 'trial', moment().toDate(), moment().add(3, 'months').toDate(), 'active', 1]
  );

  return { id: userId, username, email };
};

// Login function
const login = async (email, password) => {
  // Validate email
  if (!validator.isEmail(email)) throw new Error('Invalid email format');

  // Retrieve user from database
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (users.length === 0) throw new Error('Invalid email or password');

  const user = users[0];

  // Check if user is active
  if (!user.is_active) throw new Error('Account is not activated');

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid email or password');

  return { id: user.id, username: user.username, email: user.email };
};

// Activate account function
const activateAccount = async (activationCode) => {
  // Retrieve activation code
  const [codes] = await pool.query(
    'SELECT * FROM activation_codes WHERE activation_code = ? AND expires_at > NOW()',
    [activationCode]
  );
  if (codes.length === 0) throw new Error('Invalid or expired activation code');

  const code = codes[0];

  // Activate user account
  await pool.query('UPDATE users SET is_active = 1 WHERE id = ?', [code.user_id]);

  // Delete activation code
  await pool.query('DELETE FROM activation_codes WHERE activation_code = ?', [activationCode]);

  return { message: 'Account activated successfully' };
};

// Reset password function
const resetPassword = async (email) => {
  // Validate email
  if (!validator.isEmail(email)) throw new Error('Invalid email format');

  // Retrieve user
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (users.length === 0) throw new Error('No account found with this email');

  const user = users[0];

  // Generate and store reset token
  const resetToken = generateRandomCode();
  await pool.query(
    'INSERT INTO password_resets (user_id, reset_token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reset_token = ?, expires_at = ?',
    [user.id, resetToken, moment().add(1, 'hour').toDate(), resetToken, moment().add(1, 'hour').toDate()]
  );

  // Send reset email
  const transporter = createTransporter();
  const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset',
    text: `Click the link to reset your password: ${resetLink}`,
  };
  await transporter.sendMail(mailOptions);

  return { message: 'Password reset email sent' };
};

// Export all functions
module.exports = {
  signup,
  login,
  activateAccount,
  resetPassword,
};
