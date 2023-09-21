const express = require('express');

const {
    getCampaigns,
    addCampaign,
    deleteCampaign,
    editCampaign
} = require('../controllers/campaignsController');

const router = express.Router();

router.route('/').post(getCampaigns);
router.route('/add-campaign').post(addCampaign);
router.route('/delete-campaign').post(deleteCampaign);
router.route('/update-campaign').post(editCampaign);

module.exports = router;
