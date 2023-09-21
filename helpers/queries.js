const connection = require("../db/db");

exports.getQuery = (query, table) => {
  connection.query(query, (err, result) => {
    if (err) {
      return res.status(404).json({
        status: "fail",
        message: err,
      });
    }
    res.status(200).json({
      status: "success",
      data: result,
    });
  });
};

exports.postQuery = (query) => {
  connection.query(query, [userId], (err, result) => {
    if (err) {
      return res.status(404).json({
        status: "fail",
        message: err,
      });
    }
    if (result.length !== 0) {
      res.status(200).json({
        status: "success",
        data: result,
      });
    } else {
      res.status(200).json({
        status: "success",
        message: `There are no users with id : ${userId}...`,
      });
    }
  });
};
