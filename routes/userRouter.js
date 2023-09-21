const express = require('express');

const {
  getUsers,
  getUser,
  createUser,
  deleteUser,
  updateUser,
  useRefCode,
  favoriteActions,
  getFavorites,
  updatePassword,
  verifyYourAccount,
  refCodeUsed,
  genForgotPassword
} = require('../controllers/userController');

const router = express.Router();

router.route('/').get(getUsers);
router.route('/create-user').post(createUser);
//router.route('/:userId').get(getUser).delete(deleteUser).put(updateUser);
router.route('/ref-code-used').post(useRefCode);
router.route('/favorite-actions').post(favoriteActions);
router.route('/get-favorites').post(getFavorites);
router.route('/update-password').post(updatePassword);
router.route('/verify-your-account').post(verifyYourAccount);
router.route('/ref-code').post(refCodeUsed);
router.route('/generate-forgot-password').post(genForgotPassword);



module.exports = router;
