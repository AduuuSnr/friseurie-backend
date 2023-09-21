const express = require('express');

const {
  getAvaibleTimes,
  getAvaibleTime,
  createAvaibleTime,
  deleteAvaibleTime,
  updateAvaibleTime,
} = require('../controllers/avaibleTimesController');

const router = express.Router();

router.route('/').get(getAvaibleTimes).post(createAvaibleTime);
router
  .route('/:appId')
  .get(getAvaibleTime)
  .delete(deleteAvaibleTime)
  .put(updateAvaibleTime);

module.exports = router;
