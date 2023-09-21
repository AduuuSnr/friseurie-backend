const userController = require("./userController");
const appointmentController = require("./appointmentController");

module.exports = { ...userController, ...appointmentController };
