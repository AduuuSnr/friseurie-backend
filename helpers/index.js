const connection = require("../db/db");
const crypto = require("crypto");

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const jQuery = (sql, args = []) => {
  return new Promise((resolve, reject) => {
    if(args.length > 0) {
      connection.query(sql, args, (err, res) => {
        if (err) reject(err)
        resolve(res)
      })
    } else {
      connection.query(sql, (err, res) => {
        if (err) reject(err)
        resolve(res)
      })
    }
  })
}

const genToken = () => {
  return new Promise(resolve => {
    crypto.randomBytes(16, (err, buf) => {
      if (err) resolve(err);
      resolve(buf.toString('hex'));
    });
  });
}

module.exports = {getRandomInt, jQuery, genToken}