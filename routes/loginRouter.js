const express = require("express");

const {
  userLogin,
  } = require("../controllers/loginController");

const router = express.Router();

router.route("/").post(userLogin);
//router.route("/:userId").get(getUser).delete(deleteUser).put(updateUser);

module.exports = router;
