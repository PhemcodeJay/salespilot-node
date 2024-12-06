const express = require('express');
const router = express.Router();
const Reports = require('./Reports'); // Import the Reports class

// Route to create the reports table if it doesn't exist
router.get('/create-reports-table', async (req, res) => {
  try {
    await Reports.createReportsTable();
    res.status(200).json({ message: 'Reports table created or already exists.' });
  } catch (error) {
    res.status(500).json({ message: `Error creating reports table: ${error.message}` });
  }
});

// Route to create a new report
router.post('/create-report', async (req, res) => {
  const reportData = req.body; // Assuming the request body contains the necessary report data

  try {
    const report = await Reports.createReport(reportData);
    res.status(201).json({ message: 'Report created successfully', report });
  } catch (error) {
    res.status(500).json({ message: `Error creating report: ${error.message}` });
  }
});

// Route to get a specific report by ID
router.get('/report/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const report = await Reports.getReportById(id);
    res.status(200).json(report);
  } catch (error) {
    res.status(404).json({ message: `Report not found: ${error.message}` });
  }
});

// Route to get all reports with pagination
router.get('/reports', async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Pagination can be adjusted via query parameters

  try {
    const reports = await Reports.getAllReports({ page, limit });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: `Error fetching reports: ${error.message}` });
  }
});

// Route to update a report by ID
router.put('/report/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body; // The updated data will be sent in the request body

  try {
    const updated = await Reports.updateReport(id, updatedData);
    if (updated) {
      res.status(200).json({ message: 'Report updated successfully' });
    } else {
      res.status(404).json({ message: 'Report not found or no changes made' });
    }
  } catch (error) {
    res.status(500).json({ message: `Error updating report: ${error.message}` });
  }
});

// Route to delete a report by ID
router.delete('/report/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Reports.deleteReport(id);
    if (deleted) {
      res.status(200).json({ message: 'Report deleted successfully' });
    } else {
      res.status(404).json({ message: 'Report not found' });
    }
  } catch (error) {
    res.status(500).json({ message: `Error deleting report: ${error.message}` });
  }
});

module.exports = router;
