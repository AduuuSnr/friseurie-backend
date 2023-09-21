const connection = require('../db/db');
const { getQuery } = require('../helpers/queries');

exports.getAvaibleTimes = (req, res, next) => {
  connection.query('SELECT * FROM availabletimes', (err, result) => {
    if (err) {
      return res.status(404).json({
        status: 'fail',
        message: err,
      });
    }
    res.status(200).json({
      status: 'success',
      data: result,
    });
  });
};

exports.getAvaibleTime = (req, res, next) => {
  const { avTimeId } = req.params;
  connection.query(
    `SELECT * FROM availabletimes WHERE id = ?`,
    [appId],
    (err, result) => {
      if (err) {
        return res.status(404).json({
          status: 'fail',
          message: err,
        });
      }
      if (result.length !== 0) {
        res.status(200).json({
          status: 'success',
          data: result,
        });
      } else {
        res.status(200).json({
          status: 'error',
          message: `There are no appointment with id : ${appId}...`,
        });
      }
    }
  );
};
