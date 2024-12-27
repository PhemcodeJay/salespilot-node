require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const moment = require('moment');
const validator = require('validator');

// MySQL connection pool setup
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'salespilot',
  waitForConnections: true,
  connectionLimit: 10,
});

// Test database connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
})();

// Utility functions
const generateRandomCode = () => crypto.randomBytes(20).toString('hex');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'ionos',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

// Authentication functions
const signup = async ({ username, email, password, confirmpassword }) => {
  if (password !== confirmpassword) throw new Error('Passwords do not match');
  if (!validator.isEmail(email)) throw new Error('Invalid email format');

  const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (existingUser.length) throw new Error('User already exists');

  const hashedPassword = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO users (username, email, password, status, is_active) VALUES (?, ?, ?, ?, ?)',
    [username, email, hashedPassword, 1, 0]
  );

  const userId = result.insertId;
  const activationCode = generateRandomCode();
  await pool.query(
    'INSERT INTO activation_codes (user_id, activation_code, expires_at) VALUES (?, ?, ?)',
    [userId, activationCode, moment().add(1, 'day').toDate()]
  );

  const activationLink = `${process.env.APP_URL}/activate?code=${activationCode}`;
  await sendEmail(email, 'Activate Your Account', `Click the link to activate your account: ${activationLink}`);

  await pool.query(
    'INSERT INTO subscriptions (user_id, subscription_plan, start_date, end_date, status, is_free_trial_used) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, 'trial', moment().toDate(), moment().add(3, 'months').toDate(), 'active', 1]
  );

  return { id: userId, username, email };
};

const login = async (email, password) => {
  if (!validator.isEmail(email)) throw new Error('Invalid email format');

  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!users.length) throw new Error('Invalid email or password');

  const user = users[0];
  if (!user.is_active) throw new Error('Account is not activated');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid email or password');

  return { id: user.id, username: user.username, email: user.email };
};

const activateAccount = async (activationCode) => {
  const [codes] = await pool.query(
    'SELECT * FROM activation_codes WHERE activation_code = ? AND expires_at > NOW()',
    [activationCode]
  );
  if (!codes.length) throw new Error('Invalid or expired activation code');

  const code = codes[0];
  await pool.query('UPDATE users SET is_active = 1 WHERE id = ?', [code.user_id]);
  await pool.query('DELETE FROM activation_codes WHERE activation_code = ?', [activationCode]);

  return { message: 'Account activated successfully' };
};

const resetPassword = async (email) => {
  if (!validator.isEmail(email)) throw new Error('Invalid email format');

  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!users.length) throw new Error('No account found with this email');

  const user = users[0];
  const resetToken = generateRandomCode();
  const hashedToken = hashToken(resetToken);

  await pool.query(
    'INSERT INTO password_resets (user_id, reset_token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reset_token = ?, expires_at = ?',
    [user.id, hashedToken, moment().add(1, 'hour').toDate(), hashedToken, moment().add(1, 'hour').toDate()]
  );

  const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
  await sendEmail(email, 'Password Reset', `Click the link to reset your password: ${resetLink}`);

  return { message: 'Password reset email sent' };
};

// Export functions
module.exports = {
  signup,
  login,
  activateAccount,
  resetPassword,
};
