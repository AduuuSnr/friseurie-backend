const connection = require('../db/db');
const { getQuery } = require('../helpers/queries');
const md5 = require('md5');
const sha256 = require('sha256');
const jwt = require('jsonwebtoken');

function generateAccessToken(email) {
  return jwt.sign(email, process.env.TOKEN_SECRET, { expiresIn: '90d' });
}

exports.userLogin = (req, res) => {
  const { email, password } = req.body;
  const hash = md5(md5(password) + sha256(password));
  console.log("User logged in: " + email);
  connection.query(
    'SELECT id, firstName, lastName, email, phone, avatar, refCode, referenced, status, typeId, genderId FROM users WHERE email = ? AND password = ?',
    [email, hash],
    (err, result) => {
      if (err) {
        return res.status(200).json({
          status: 'error',
          message: err,
        });
      } else {
        //User
        if(result.length === 0) {
          return res.status(200).json({
            status: 'credentialError',
            message: 'Invalid Credidentals',
          });
        }
        if(result[0].status === 0) {
          return res.status(200).json({
            status: 'verificationError',
            message: 'You have not verified your e-mail address',
          });
        } else if(result[0].status === 2) {
          return res.status(200).json({
            status: 'accountError',
            message: 'Your account is temporarily disabled.',
          });
        }
        if(result[0].typeId === 1) {

          const token = generateAccessToken({ email });
          let data = [];
          data = result[0];
          delete data.password;
          delete data.status;
          return res.status(200).json({
            status: 'success',
            message: 'Successfully logged in',
            token: token,
            userData: data,
          });
        } else {
          //Shop Owner
          const token = generateAccessToken({ email });
          connection.query(
            'SELECT U.id, U.firstName, U.password, U.lastName, U.email, U.phone, U.avatar, U.refCode, U.status, U.referenced, S.id AS shopId, S.shopName, S.address, S.latitude, S.longitude, S.phone, S.avatar FROM users U INNER JOIN shops S ON S.userId = U.id WHERE email= ? AND password=?',
            [email, hash],
            (errOwner, resultOwner) => {
              if (errOwner) {
                return res.status(200).json({
                  status: 'error',
                  message: errOwner,
                });
              } else {
                let data2 = [];
                data2 = resultOwner[0];
                delete data2.password;
                delete data2.typeId;
                return res.status(200).json({
                  status: 'success',
                  message: 'Successfully logged in',
                  token: token,
                  userData: data2,
                });
              }
            }
          );
        }
      }
    }
  );
};
