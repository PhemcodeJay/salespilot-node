const db = require('../db');  // Assuming db is in the 'db.js' file or configured separately.

class StaffModel {

    // Method to insert a new staff record
    static insertStaff(staff_name, staff_email, staff_phone, position) {
        const query = "INSERT INTO staffs (staff_name, staff_email, staff_phone, position) VALUES (?, ?, ?, ?)";
        const params = [staff_name, staff_email, staff_phone, position];
        return db.execute(query, params);
    }

    // Method to update an existing staff record
    static updateStaff(staff_name, staff_email, staff_phone, position, staff_id) {
        const query = "UPDATE staffs SET staff_name = ?, staff_email = ?, staff_phone = ?, position = ? WHERE staff_id = ?";
        const params = [staff_name, staff_email, staff_phone, position, staff_id];
        return db.execute(query, params);
    }

    // Method to delete a staff record by staff_id
    static deleteStaff(staff_id) {
        const query = "DELETE FROM staffs WHERE staff_id = ?";
        return db.execute(query, [staff_id]);
    }

    // Method to fetch staff data by staff_id
    static getStaffById(staff_id) {
        const query = "SELECT * FROM staffs WHERE staff_id = ?";
        return db.execute(query, [staff_id]);
    }

    // Method to fetch all staff data
    static getAllStaff() {
        const query = "SELECT * FROM staffs";
        return db.execute(query);
    }
}

module.exports = staff;
