const connection = require('../db/db');
const md5 = require('md5');
const sha256 = require('sha256');
const nodemailer = require('nodemailer');
const {getRandomInt, jQuery, genToken} = require("../helpers")

exports.createOwner = async (req, res) => {
    const { firstName, lastName, email, password, shopName } = req.body;


    const hash = md5(md5(password) + sha256(password));

    const signupDate = new Date();
    const formattedDate = signupDate
        .toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '')
        .slice(0, 10);
    let typeId = 2;

    // Create a ref code
    let refCode
    while (true) {
        refCode = getRandomInt(1, 999999);
        const checkRefCode = await jQuery(`SELECT id FROM users WHERE refCode=${refCode}`);
        if(checkRefCode.length === 0) break;
    }

    connection.query(
        `INSERT INTO 
    users(firstName, lastName, email, password, signupDate, lastVisit, refCode, typeId) 
    VALUES(?, ?, ?, ?, "${formattedDate}", "${formattedDate}", ${refCode}, ${typeId})`,
        [
            firstName,
            lastName,
            email,
            hash
        ],
        async (err, created) => {
            if (err) {
                console.log("error registration");
                return res.status(200).json({
                    status: 'fail'
                });
            }
            console.log("barber registration");
            const times = `[{"dayId":0,"startTime":"09:00","endTime":"20:30","interval":30},{"dayId":1,"startTime":"09:00","endTime":"20:30","interval":30},{"dayId":2,"startTime":"09:00","endTime":"20:30","interval":30},{"dayId":3,"startTime":"09:00","endTime":"20:30","interval":30},{"dayId":4,"startTime":"09:00","endTime":"20:30","interval":30},{"dayId":5,"startTime":"09:00","endTime":"20:30","interval":30},{"dayId":6,"startTime":"09:00","endTime":"20:30","interval":30}]`;
            connection.query('INSERT INTO shops(shopName, userId, times) VALUES(?, ?, ?)',[
                shopName, created.insertId, times
            ], (errorShop, resShop) => {
                if(errorShop) throw errorShop;
                res.status(200).json({
                    status: 'success',
                });
            });

            let token
            while(true) {
                token = await genToken();
                const checkToken = await jQuery(`SELECT userId FROM verification WHERE token='${token}'`);
                if(checkToken.length === 0) break;
            }

            const insertToken = await jQuery(`INSERT INTO verification VALUES('${token}', ${created.insertId})`);
            if(insertToken.affectedRows > 0) {

                const transporter = nodemailer.createTransport({
                    host: 'blizzard.mxrouting.net',
                    port: 465,
                    secure: true,
                    auth: {
                        user: 'no-reply@friseurie.com',
                        pass: '{RbA#&(HjL3z'
                    },
                });

                const friseurieUrl = "https://verification.friseurie.com/verify";

                const mailOptions = {
                    from: 'no-reply@friseurie.com',
                    to: email,
                    subject: 'Verify Your Account',
                    text: `\nThanks for your registration! You need to complete one more step to get full access to your account. Click on the link below to activate your account.\nLink: ${friseurieUrl}/${token}`
                };
                console.log("mail sent 1");
                await transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                        data = {"status": "error", "message": "mail error"};
                        return res.status(200).send(data);
                    } else {
                        data = {"status": "success", "message": "Success"};
                        console.log("mail sent 2");
                        return res.status(200).send(data);
                    }
                });
            }

        }
    );
};

exports.getOwners = (req, res, next) => {

  connection.query('SELECT * FROM users WHERE typeId = 2', (err, result) => {
    if (err) {
      return res.status(200).json({
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

exports.getOwner = (req, res, next) => {
  const { userId } = req.params;
  connection.query(
    `SELECT * FROM users WHERE id = ? AND typeId = 2`,
    [userId],
    (err, result) => {
      if (err) {
        return res.status(200).json({
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
          status: 'success',
          message: `There are no users with id : ${userId}...`,
        });
      }
    }
  );
};

exports.updateOwner = (req, res, next) => {
  const { userId } = req.params;
  const { firstName, lastName, email, phone, avatar } = req.body;
  connection.query(
    `UPDATE users SET firstName='${firstName}', lastName = '${lastName}', email = '${email}', phone = '${phone}', avatar = '${avatar}' WHERE id = ? AND typeId = 2`,
    [userId],
    (err, result) => {
      if (err) {
        return res.status(200).json({
          status: 'fail',
          message: err,
        });
      }
      if (result.affectedRows !== 0) {
        res.status(200).json({
          status: 'success',
          data: result,
        });
      } else {
        res.status(200).json({
          status: 'success',
          data: `User with id : ${userId} doesn't exists... `,
        });
      }
    }
  );
};

exports.deleteOwner = (req, res, next) => {
  const { userId } = req.params;
  connection.query(
    `DELETE FROM users WHERE id = ?`,
    [userId],
    (err, result) => {
      if (err) {
        return res.status(200).json({
          status: 'fail',
          message: err,
        });
      }
      res.status(200).json({
        status: 'success',
        data: `User with id ${userId} is deleted...`,
      });
    }
  );
};
