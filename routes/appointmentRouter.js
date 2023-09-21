const express = require('express');

const {
  getAppointments,
  getAppointment,
  todaysAppointments,
  deleteAppointment,
  appointmentHistory,
  bookNowScreen,
  jimiPractice,
  createAppointment,
  barberAppointmentsByDate,
  adsForUsers,
  getShopsByLocation,
  searchBarberShops,
  userAppointments,
  increaseReferenced,
  barberRankingList,
  setAppointmentStatus,
  getAShop,
  updateUserAvatar,
  userRateAppointment,
  checkUpcomingAppointments
} = require('../controllers/appointmentController');

const router = express.Router();

router.route('/todays-appointments').post(todaysAppointments);
router.route('/appointment-history').post(appointmentHistory);
router.route('/get-appointments').post(getAppointments);
router.route('/get-appointment').post(getAppointment);
router.route('/delete-appointment').delete(deleteAppointment);
router.route("/book-now-screen").post(bookNowScreen);
router.route("/jimi-practice").post(jimiPractice);
router.route("/a-new-appointment").post(createAppointment);
router.route("/get-barber-appointments").post(barberAppointmentsByDate);
router.route("/ads-for-users").post(adsForUsers);
router.route("/get-shops-by-location").post(getShopsByLocation);
router.route("/search-barber-shops").post(searchBarberShops);
router.route("/user-appointments").post(userAppointments);
router.route("/increase-referenced").post(increaseReferenced);
router.route("/barber-ranking-list").post(barberRankingList);
router.route("/set-appointment-status").post(setAppointmentStatus);
router.route("/get-a-shop").post(getAShop);
router.route("/update-user-avatar").post(updateUserAvatar);
router.route("/user-rate-appointment").post(userRateAppointment);
router.route("/check-upcoming-appointments").get(checkUpcomingAppointments);






module.exports = router;
