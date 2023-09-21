const express = require('express');
const { authenticateToken } = require('../helpers/secretHelper');
const { getSecret } = require('../controllers/secretController');
const router = express.Router();

router.route('/').get(authenticateToken, getSecret);

module.exports = router;
