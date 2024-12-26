const User = require('../models/user');  // Adjust the path as needed
const moment = require('moment'); // Importing moment.js to handle date manipulation

class authcontroller {
  // Create a new user with a 3-month free trial
  static async create(req, res) {
    const { username, email, password, phone, role } = req.body;

    if (!username || !email || !password || !phone || !role) {
      return res.status(400).json({ error: 'All fields are required: username, email, password, phone, role' });
    }

    // Calculate 3 months from the current date
    const trialEndDate = moment().add(3, 'months').format('YYYY-MM-DD');

    try {
      const result = await User.create({ 
        username, 
        email, 
        password, 
        phone, 
        role, 
        trial_end_date: trialEndDate  // Adding the trial end date
      });
      res.status(201).json({ message: 'User created successfully with a 3-month free trial.', data: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get a user by email
  static async getByEmail(req, res) {
    const { email } = req.params;

    try {
      const user = await User.getByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.status(200).json({ data: user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get a user by ID
  static async getById(req, res) {
    const { id } = req.params;

    try {
      const user = await User.getById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.status(200).json({ data: user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Update a user
  static async update(req, res) {
    const { id } = req.params;
    const { username, email, password, phone, role } = req.body;

    if (!username || !email || !password || !phone || !role) {
      return res.status(400).json({ error: 'All fields are required: username, email, password, phone, role' });
    }

    try {
      const success = await User.update(id, { username, email, password, phone, role });
      if (!success) {
        return res.status(404).json({ error: 'User not found or not updated.' });
      }
      res.status(200).json({ message: 'User updated successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Delete a user
  static async delete(req, res) {
    const { id } = req.params;

    try {
      const success = await User.delete(id);
      if (!success) {
        return res.status(404).json({ error: 'User not found or not deleted.' });
      }
      res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = authcontroller;
