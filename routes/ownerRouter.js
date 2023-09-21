const express = require('express');

const {
  getOwners,
  getOwner,
  createOwner,
  deleteOwner,
  updateOwner
} = require('../controllers/ownerController');

const router = express.Router();

router.route('/').get(getOwners);
router.route('/create-owner').post(createOwner);
router.route('/:ownerId').get(getOwner).delete(deleteOwner).put(updateOwner);

module.exports = router;
