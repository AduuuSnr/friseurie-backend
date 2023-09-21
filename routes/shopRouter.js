const express = require('express');

const {
  getShops,
  getShop,
  getStaff,
  getGallery,
  getServices,
  rateShop,
  getShopDetails,
  availableStaff,
  getStaffServices,
  editGallery,
  staffActions,
  shopActions
} = require('../controllers/shopController');

const router = express.Router();

router.route('/get-shop').post(getShop);
router.route('/get-shops').post(getShops);
router.route('/get-staff').post(getStaff);
router.route('/get-gallery').post(getGallery);
router.route('/get-services').post(getServices);
router.route('/rate-shop').post(rateShop);
router.route('/get-shop-details').post(getShopDetails);
router.route('/get-staff-times').post(availableStaff);
router.route('/get-staff-services').post(getStaffServices);
router.route('/edit-gallery').post(editGallery);
router.route('/staff-actions').post(staffActions);
router.route('/shop-actions').post(shopActions);
module.exports = router;
