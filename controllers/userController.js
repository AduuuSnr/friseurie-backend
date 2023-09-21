const connection = require('../db/db');
const md5 = require('md5');
const sha256 = require('sha256');
const nodemailer = require('nodemailer');
const {getRandomInt, jQuery, genToken} = require("../helpers")

/*jimir3x*/
exports.createUser = async (req, res) => {  
  const { firstName, lastName, email, password, gender } = req.body;
  

  const hash = md5(md5(password) + sha256(password));
  const signupDate = new Date();
  const formattedDate = signupDate
        .toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '')
        .slice(0, 10);
  let typeId = 1;

  // Create a ref code
  let refCode
  while (true) {
    refCode = getRandomInt(1, 999999);
    const checkRefCode = await jQuery(`SELECT id FROM users WHERE refCode=${refCode}`);
    if(checkRefCode.length === 0) break;
  }
  
  connection.query(
    `INSERT INTO 
    users(firstName, lastName, email, password, signupDate, lastVisit, refCode, typeId, genderId) 
    VALUES(?, ?, ?, ?, "${formattedDate}", "${formattedDate}", ${refCode}, ${typeId}, ?)`,
    [
      firstName,
      lastName,
      email,
      hash,
      gender
    ],
    async (err, result) => {
      if (err) {
        return res.status(200).json({
          status: 'fail',
          message: err,
        });
      }

      let token
      while(true) {
        token = await genToken();
        const checkToken = await jQuery(`SELECT userId FROM verification WHERE token='${token}'`);
        if(checkToken.length === 0) break;
      }

      const insertToken = await jQuery(`INSERT INTO verification VALUES('${token}', ${result.insertId})`);
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

        await transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return res.status(200).send({"status": "error", "message": "mail error"});
            } else {
                console.log("user registration mail sent");
                return res.status(200).send({"status": "success", "message": "Success"});
            }
        });
      }
      
    }
  );
};

exports.verifyYourAccount = async (req, res) => {
  const {token} = req.body;
  console.log("verify req");
  const verify = await jQuery(`
    UPDATE users U 
    INNER JOIN verification V ON V.userId = U.id
    SET U.status = 1
    WHERE V.token = ?
  `, [token]);

  if(verify.affectedRows === 1) {
    const deleteToken = await jQuery(`DELETE FROM verification WHERE token = ?`, [token])
    if(deleteToken.affectedRows === 1) res.json({status: "success"});
    else res.json({status: "error", message: "Something's went wrong!"});
  } else {
      res.json({
          status: "error",
          message: "invalid token specified"
      })
  }

  
}
/*jimir3x*/




exports.genForgotPassword = async (req, res, next) => {
    const {email} = req.body;

    const checkUser = await jQuery(`SELECT email, id, COUNT(id) as num FROM users WHERE email = ?`, [email]);
    console.log(checkUser);
    if(checkUser[0].num > 0) {
        const checkToken = await jQuery(`SELECT userId, COUNT(id) as num FROM mailTokens WHERE userId = ?`, [checkUser[0].id]);
        /*if(checkToken[0].num > 0) {
            return res.status(200).send({"status": "error", "message": "mail send error"});

        }*/
        let token
        while(true) {
            token = await genToken();
            const checkToken = await jQuery(`SELECT userId FROM mailTokens WHERE token='${token}'`);
            if(checkToken.length === 0) break;
        }
        const transporter = nodemailer.createTransport({
            host: 'blizzard.mxrouting.net',
            port: 465,
            secure: true,
            auth: {
                user: 'no-reply@friseurie.com',
                pass: '{RbA#&(HjL3z'
            },
        });
        let date = new Date().getTime() + 86400000;
        date = new Date(date).toISOString();
        date = `${date.split('T')[0]} ${date.split('T')[1].split('.')[0]}`;
        console.log(date);
        const friseurieUrl = "https://forgotpassword.friseurie.com/change-password";

        const mailOptions = {
            from: 'no-reply@friseurie.com',
            to: checkUser[0].email,
            subject: 'Recover Your Password',
            text: `\nYou have requested a password recovery. Click on the link below to recover your account.\nLink: ${friseurieUrl}/${token}`
        };
        const insertToken = await jQuery(`INSERT INTO mailTokens(userId, token, expire) VALUES(?, ?, ?)`, [checkUser[0].id, token, date]);
        if(insertToken.affectedRows > 0) {
            await transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                    return res.status(200).send({"status": "error", "message": "mail send error"});
                } else {
                    console.log("user registration mail sent");
                    return res.status(200).send({"status": "success", "message": "Success"});
                }
            });
        }


    } else {
        return res.status(200).send({"status": "error", "message": "There is no email found"});
    }
}

exports.useRefCode = (req, res, next) => {
    const { refCode, userId } = req.body;

    connection.query(`SELECT id FROM users WHERE id= ? AND refCodeUsed = 0`, [userId], (error, response) => {
        if(error) {
            throw error;
        } else {
            if(response.length === 1) {
                connection.query(`UPDATE users SET referenced = referenced + 1 WHERE refCode = ?`,[refCode], (err, result) => {
                    if (err) {
                        return res.status(200).json({
                            status: 'fail',
                            message: err,
                        });
                    }
                    connection.query('UPDATE users SET refCodeUsed = 1 WHERE id = ?',[userId]);
                    return res.status(200).json({
                        status: 'success',
                    });
                });
            } else {
                return res.status(200).json({
                    status: 'error',
                    message: 'User already used a reference code'
                });
            }
        }
    });

};

exports.refCodeUsed = (req, res, next) => {
    const { userId } = req.body;

    connection.query(`SELECT referenced as RefCodeUsed FROM users WHERE id= ?`, [userId], (error, response) => {
        if(error) {
            throw error;
        } else {
            return res.status(200).json({
                status: 'success',
                refCodeUsed: response[0].RefCodeUsed
            });
        }
    });

};

exports.favoriteActions = (req, res, next) => {
    const { shopId, userId, check } = req.body;
    console.log("favorite action");
    if(check === 1) {
        connection.query(`SELECT * FROM favorites WHERE shopId= ? AND userId = ?`, [shopId, userId], (error, response) => {
            if(error) {
                throw error;
            } else {
                if(response.length === 1) {
                    return res.status(200).json({
                        status: 'success',
                    });
                } else {
                    return res.status(200).json({
                        status: 'fail',
                    });
                }
            }
        });
    } else {
        connection.query(`SELECT * FROM favorites WHERE shopId= ? AND userId = ?`, [shopId, userId], (error, response) => {
            if(error) {
                throw error;
            } else {
                if(response.length > 0) {
                    connection.query(`DELETE FROM favorites WHERE userId = ? AND shopId = ?`,[userId, shopId], (err, result) => {
                        if (err) {
                            return res.status(200).json({
                                status: 'fail',
                                message: err,
                            });
                        }

                        return res.status(200).json({
                            status: 'success',
                        });
                    });
                } else {
                    connection.query(`INSERT INTO favorites(shopId, userId) VALUES(?, ?)`,[shopId, userId], (err, result) => {
                        if (err) {
                            return res.status(200).json({
                                status: 'fail',
                                message: err,
                            });
                        }

                        return res.status(200).json({
                            status: 'success',
                        });
                    });
                }
            }
        });
    }
};

exports.getFavorites = (req, res, next) => {
    const { userId } = req.body;

    const date = new Date();
    const day = date.getDay();
    const ymd = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
        connection.query(`
            SELECT
                (
                  CASE
                    WHEN ((SELECT COUNT(id) FROM availabletimes WHERE shopId = shops.id AND dayId = ${day}) *
                    (SELECT COUNT(id) FROM staffs WHERE shopId = shops.id) -
                    (SELECT COUNT(id) FROM appointments WHERE shopId = shops.id AND DATE(date) = '${ymd}')) > 0
                    THEN 'available'
                    ELSE 'full'
                  END
                ) AS status,
                ROUND((
                    SELECT
                        SUM( rating ) 
                    FROM
                        ratings 
                    WHERE
                        shopId = shops.id 
                    ) / ( SELECT COUNT( rating ) FROM ratings WHERE shopId = shops.id )) AS rating,
                shops.*, shops.id as shopId
            FROM
                favorites
                INNER JOIN shops ON favorites.shopId = shops.id 
            WHERE
                favorites.userId = ?`, [userId], (error, response) => {
            if(error) {
                throw error;
            } else {

                    return res.status(200).json({
                        status: 'success',
                        data: response
                    });

            }
        });
};

exports.getUsers = (req, res, next) => {

  connection.query(`SELECT * FROM users`, (err, result) => {
    if (err) {
      return res.status(200).json({
        status: 'fail',
        message: err,
      });
    }
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  });
};

exports.getUser = (req, res, next) => {
  const { userId } = req.params;
  connection.query(
    `SELECT * FROM users WHERE id = ?`,
    [userId],
    (err, result) => {
      if (err) {
        return res.status(200).json({
          status: 'fail',
          message: err,
        });
      }
      if (result.length !== 0) {
          return res.status(200).json({
          status: 'success',
          data: result,
        });
      } else {
          return res.status(200).json({
          status: 'success',
          message: `There are no users with id : ${userId}...`,
        });
      }
    }
  );
};

exports.updatePassword = (req, res, next) => {

    const { userId, oldPass, newPass, token } = req.body;
    let currPassword = null;
    let usersId = null;
    if(token) {
        connection.query(`SELECT *
                          FROM mailTokens
                          WHERE token = ?`, [token], (error, response) => {
            if (error) throw error;
            if (response.length === 1) {

                usersId = response[0].userId;
                    const hash = md5(md5(newPass) + sha256(newPass));
                    connection.query(
                        `UPDATE users
                         SET password = ?
                         WHERE id = ?`,
                        [hash, usersId],
                        async (err, result) => {
                            if (err) {
                                return res.status(200).json({
                                    status: 'fail',
                                    message: err,
                                });
                            }
                            if (result.affectedRows === 1) {
                                await jQuery(`DELETE FROM mailTokens WHERE token = ?`, [token]);
                                return res.status(200).json({
                                    status: 'success'
                                });
                            } else {
                                return res.status(200).json({
                                    status: 'error',
                                    data: `An error occured`,
                                });
                            }
                        }
                    );

            } else {
                return res.status(200).json({
                    status: 'error',
                    data: `Invalid Token`,
                });
            }
        })
    } else {
        connection.query(`SELECT *
                          FROM users
                          WHERE id = ?`, [userId], (error, response) => {
            if (error) throw error;
            if (response.length === 1) {
                currPassword = response[0].password;
                usersId = response[0].id;
                const useroldPass = md5(md5(oldPass) + sha256(oldPass));
                if (useroldPass === currPassword) {
                    const hash = md5(md5(newPass) + sha256(newPass));
                    connection.query(
                        `UPDATE users
                         SET password = ?
                         WHERE id = ?
                           AND password = ?`,
                        [hash, usersId, currPassword],
                        (err, result) => {
                            if (err) {
                                return res.status(200).json({
                                    status: 'fail',
                                    message: err,
                                });
                            }
                            if (result.affectedRows === 1) {
                                return res.status(200).json({
                                    status: 'success'
                                });
                            } else {
                                return res.status(200).json({
                                    status: 'error',
                                    data: `An error occured`,
                                });
                            }
                        }
                    );
                } else {
                    return res.status(200).json({
                        status: 'error',
                        data: `Wrong old password`,
                    });
                }
            } else {
                return res.status(200).json({
                    status: 'error',
                    data: `An unknown error occured`,
                });
            }
        })
    }


};

exports.updateUser = (req, res, next) => {
  const { userId } = req.params;
  const { firstName, lastName, email, phone, avatar } = req.body;
  connection.query(
    `UPDATE users SET firstName='${firstName}', lastName = '${lastName}', email = '${email}', phone = '${phone}', avatar = '${avatar}' WHERE id = ?`,
    [userId],
    (err, result) => {
      if (err) {
        return res.status(200).json({
          status: 'fail',
          message: err,
        });
      }
      if (result.affectedRows !== 0) {
          return res.status(200).json({
          status: 'success',
          data: result,
        });
      } else {
          return res.status(200).json({
          status: 'success',
          data: `User with id : ${userId} doesn't exists... `,
        });
      }
    }
  );
};

exports.deleteUser = (req, res, next) => {
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
        return res.status(200).json({
        status: 'success',
        data: `User with id ${userId} is deleted...`,
      });
    }
  );
};
