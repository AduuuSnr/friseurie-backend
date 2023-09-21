const connection = require('../db/db');

const jQuery = (sql, args = []) => {
    return new Promise((resolve, reject) => {
        if (args.length > 0) {
            connection.query(sql, args, (err, res) => {

                if (err) resolve(err)
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

exports.staffActions = async (req, res, next) => {
    const {action, staffId, firstName, lastName, avatar, shopId, daysArr} = req.body;

    if (action && action === 'delete-staff') {
        const delStaff = await jQuery(`UPDATE staffs
                                       SET isDeleted = 1
                                       WHERE id = ?`, [staffId]);
        if (delStaff.affectedRows > 0) {
            res.status(200).json({
                status: "success"
            })
        } else {
            res.status(200).json({
                status: "error",
                message: "som thin went wrn bic"
            })
        }
    } else if (action && action === "add-staff") {
        const addStaff = await jQuery(`INSERT INTO staffs(firstName, lastName, avatar, shopId)
                                       VALUES (?, ?, ?, ?)`, [firstName, lastName, avatar, shopId])
        if (addStaff) {
            res.status(200).json({
                status: "success"
            })
        } else {
            res.status(200).json({
                status: "error",
                message: "som thin went wrn bic"
            })
        }
    } else if (action && action === "edit-staff") {
        const staffDays = daysArr;

        let addQ;
        const delOldTimes = await jQuery(`DELETE
                                          FROM availabletimesforstaffs
                                          WHERE staffId = ?`, [staffId]);
        for (let i = 0; i < staffDays.length; i++) {
            addQ = await jQuery(`INSERT INTO availabletimesforstaffs(availability, staffId, dayId)
                                 VALUES (?, ?,
                                         ?)`, [staffDays[i].availability, staffDays[i].staffId, staffDays[i].dayId])

        }


        console.log("bitc");
        const editStaff = await jQuery(`UPDATE staffs
                                        SET firstName = ?,
                                            lastName  = ?,
                                            avatar    = ?
                                        WHERE id = ?`, [firstName, lastName, avatar, staffId])
        if (editStaff.affectedRows > 0) {
            res.status(200).json({
                status: "success"
            })
        } else {
            res.status(200).json({
                status: "error",
                message: "som thin went wrn bic"
            })
        }
    } else if (action && action == "get-staff-times") {
        const staffTimes = await jQuery(`SELECT *
                                         FROM availabletimesforstaffs
                                         WHERE staffId = ?`, [staffId]);
        res.status(200).json({
            status: "success",
            times: staffTimes
        })

    } else {
        res.status(200).json({
            status: "error",
            message: "u cant du dis"
        })
    }


}

exports.shopActions = async (req, res, next) => {
    const {
        action,
        serviceName,
        icon,
        serviceId,
        price,
        shopId,
        dayId,
        startTime,
        endTime,
        interval,
        staffId
    } = req.body;


    if (action && action === 'add-service') {
        const addService = await jQuery(`INSERT INTO providedservices(price, shopId, serviceId)
                                         VALUES (?, ?, ?)`, [price, shopId, serviceId])
        if (addService) {
            res.status(200).json({
                status: "success"
            })
        } else {
            res.status(200).json({
                status: "error",
                message: "som thin went wrn bic"
            })
        }
    }
    if (action && action === 'add-staff-service') {
        const addService = await jQuery(`INSERT INTO providedservicesbystaff(staffId, serviceId)
                                         VALUES (?, ?)`, [staffId, serviceId])
        if (addService) {
            res.status(200).json({
                status: "success"
            })
        } else {
            res.status(200).json({
                status: "error",
                message: "som thin went wrn bic"
            })
        }
    } else if (action && action === 'delete-service') {
        const deleteService = await jQuery(`DELETE
                                            FROM providedservices
                                            WHERE shopId = ?
                                              AND serviceId = ?`, [shopId, serviceId])

        if (deleteService.affectedRows > 0) {
            res.status(200).json({
                status: "success"
            })
        } else {
            res.status(200).json({
                status: "error",
                message: "som thin went wrn bic"
            })
        }
    } else if (action && action === 'delete-staff-service') {
        const deleteService = await jQuery(`DELETE
                                            FROM providedservicesbystaff
                                            WHERE staffId = ?
                                              AND serviceId = ?`, [staffId, serviceId])

        if (deleteService.affectedRows > 0) {
            res.status(200).json({
                status: "success"
            })
        } else {
            res.status(200).json({
                status: "error",
                message: "som thin went wrn bic"
            })
        }
    } else if (action && action === 'get-service') {

        const getAll = await jQuery(`SELECT *
                                     FROM services`);
        let shopServices = await jQuery(`SELECT *
                                         FROM providedservices
                                         WHERE shopId = ${shopId}`);

        getAll.map(service => {
            shopServices.map(serv => {

                if (service.id === serv.serviceId) {
                    service.isin = true;
                    service.price = serv.price;
                    service.serviceid = serv.id
                }


            })

        })

        res.status(200).json({
            status: "success",
            data: getAll
        })
    } else if (action && action === 'get-staff-service') {

        const getAll = await jQuery(`SELECT *
                                     FROM services`);
        let shopServices = await jQuery(`SELECT *
                                         FROM providedservicesbystaff
                                         WHERE staffId = ?`, [staffId]);

        getAll.map(service => {
            shopServices.map(serv => {

                if (service.id === serv.serviceId) {
                    service.isin = true;
                    service.price = serv.price;
                    service.serviceid = serv.id
                }


            })

        })

        res.status(200).json({
            status: "success",
            data: getAll
        })
    } else if (action && action === 'edit-service') {

        const editService = await jQuery(`UPDATE providedservices
                                          SET price = ?
                                          WHERE id = ?`, [price, serviceId]);

        if (editService.affectedRows > 0) {
            res.status(200).json({
                status: "success"
            })
        } else {
            res.status(200).json({
                status: "error",
                message: "Erör"
            })
        }
    } else if (action && action === "get-store-days") {
        const days = await jQuery(`SELECT *
                                   FROM availabletimes
                                   WHERE shopId = ?`, [shopId]);
        console.log(days)
        res.status(200).json({
            status: "success",
            storeDays: days
        })
    } else if (action && action === "update-store-days") {
        if (startTime > endTime) {
            console.log("hatalı")
            return res.json({
                status: "error",
                message: "invalid times"
            })
        }

        let makeTimeIntervals = function (startTime, endTime, increment) {
            startTime = startTime.toString().split(':');
            endTime = endTime.toString().split(':');
            increment = parseInt(increment, 10);

            let pad = function (n) {
                    return (n < 10) ? '0' + n.toString() : n;
                },
                startHr = parseInt(startTime[0], 10),
                startMin = parseInt(startTime[1], 10),
                endHr = parseInt(endTime[0], 10),
                endMin = parseInt(endTime[1], 10),
                currentHr = startHr,
                currentMin = startMin,
                previous = currentHr + ':' + pad(currentMin),
                current = '',
                r = [];

            do {
                currentMin += increment;
                if ((currentMin % 60) === 0 || currentMin > 60) {
                    currentMin = (currentMin === 60) ? 0 : currentMin - 60;
                    currentHr += 1;
                }
                current = currentHr + ':' + pad(currentMin);
                r.push(current);
                previous = current;
            } while (currentHr !== endHr);

            return r;
        };

        let a = makeTimeIntervals(startTime, endTime, interval);
        let myArr = [{
            time: startTime,
            dayId: dayId,
            shopId: shopId
        }];

        for (let i in a) if (a.hasOwnProperty(i)) {
            myArr = [...myArr, {
                time: a[i],
                dayId: dayId,
                shopId: shopId
            }];
        }

        myArr.pop();
        //console.log(myArr);
        let shopTimes = await jQuery(`SELECT times
                                      FROM shops
                                      WHERE id = ${shopId}`)

        let getTimes = (shopTimes[0].times);
        let newJson = JSON.parse(getTimes);
        newJson[dayId] = {
            dayId: dayId,
            startTime: startTime,
            endTime: endTime,
            interval: interval
        };

        let addQ;
        const delOldTimes = await jQuery(`DELETE
                                          FROM availabletimes
                                          WHERE shopId = ?
                                            AND dayId = ?`, [shopId, dayId]);
        for (let i = 0; i < myArr.length; i++) {
            addQ = await jQuery(`INSERT INTO availabletimes(time, shopId, dayId)
                                 VALUES (?, ?, ?)`, [myArr[i].time, myArr[i].shopId, myArr[i].dayId,])

        }

        const updateShopInfo = jQuery(`UPDATE shops
                                       SET times = ?
                                       WHERE id = ?`, [JSON.stringify(newJson), shopId])
        console.log("resss")
        res.status(200).json({
            status: "success"
        })

    }


}

exports.useRefShop = (req, res, next) => {
    const {refCode, userId} = req.body;

    connection.query('SELECT id FROM users WHERE id= ? AND refCodeUsed = 0', [userId], (error, response) => {
        if (error) {
            throw error;
        } else {
            if (response.length === 1) {
                connection.query('UPDATE users SET referenced = referenced + 1 WHERE refCode = ?', [refCode], (err, result) => {
                    if (err) {
                        return res.status(200).json({
                            status: 'fail',
                            message: err,
                        });
                    }
                    connection.query('UPDATE users SET refCodeUsed = 1 WHERE id = ?', [userId]);
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

exports.getShopDetails = async (req, res, next) => {

    let {shopId} = req.body;


    connection.query('SELECT CEIL(RAND()*(100-10)+10) as price, CEIL(RAND()*(2-0)) as status, S.*, ROUND((SELECT SUM(rating) FROM ratings WHERE shopId = S.id) / (SELECT COUNT(userId) FROM ratings WHERE shopId = S.id)) AS rating FROM shops S WHERE S.id = ?',
        [
            shopId
        ], (err, response) => {
            if (err) {
                return res.status(200).json({
                    status: 'fail',
                    message: err,
                });
            }
            console.log("fetching shop details");
            connection.query("SELECT * FROM staffs WHERE shopId = ? AND isDeleted = 0", [response[0].id], (errorStaff, staffResponse) => {
                if (errorStaff) throw errorStaff;
                console.log("fetching staff");
                connection.query("SELECT * FROM gallery WHERE shopId = ?", [response[0].id], (errorGallery, galleryResponse) => {
                    if (errorStaff) throw errorStaff;
                    console.log("fetching gallery");
                    connection.query("SELECT providedservices.*, services.* FROM providedservices INNER JOIN services on providedservices.serviceId = services.id WHERE providedservices.shopId = ?", [response[0].id], (errorServices, servicesResponse) => {
                        if (errorServices) throw errorServices;
                        console.log("fetching services");
                        let finalData = {
                            shopData: response,
                            staffData: staffResponse,
                            galleryData: galleryResponse,
                            servicesData: servicesResponse
                        }
                        return res.status(200).json({
                            status: 'success',
                            data: finalData,
                        });
                    });
                });

            });

        });

};

exports.editGallery = async (req, res, next) => {
    const {shopId, action, imageId, src} = req.body;

    if (action && action === 'delete') {
        const deleteImage = await jQuery(`DELETE
                                          FROM gallery
                                          WHERE id = ?
                                            AND shopId = ?`, [imageId, shopId]);

        if (deleteImage.affectedRows > 0) {
            res.status(200).json({
                status: "success"
            });
        } else {
            res.status(200).json({
                status: "error",
                message: "I dont know what's happened!"
            });
        }
    } else if (action && action === "add-new") {
        const deleteImage = await jQuery(`INSERT INTO gallery(src, shopId)
                                          VALUES (?, ?) `, [src, shopId]);

        if (deleteImage.affectedRows > 0) {
            res.status(200).json({
                status: "success"
            });
        } else {
            res.status(200).json({
                status: "error",
                message: "I dont know what's happened!"
            });
        }
    }

}

exports.getShops = async (req, res, next) => {


    let {latitude, longitude} = req.body;
    latitude = parseInt(latitude);
    longitude = parseInt(longitude);
    const range = 1;

    let pos2 = {
        "lat": latitude - range,
        "lon": longitude - range
    };

    let pos3 = {
        "lat": latitude - range,
        "lon": longitude + range
    };

    let pos4 = {
        "lat": latitude + range,
        "lon": longitude - range
    };

    let pos5 = {
        "lat": latitude + range,
        "lon": longitude + range
    };


    connection.query('SELECT CEIL(RAND()*(100-10)+10) as price, CEIL(RAND()*(2-0)) as status, S.*, ROUND((SELECT SUM(rating) FROM ratings WHERE shopId = S.id) / (SELECT COUNT(userId) FROM ratings WHERE shopId = S.id)) AS rating FROM shops S WHERE S.latitude > ? AND S.longitude > ? AND S.latitude > ? AND S.longitude < ? AND S.latitude < ? AND S.longitude > ? AND S.latitude < ? AND S.longitude < ?',
        [
            pos2.lat,
            pos2.lon,
            pos3.lat,
            pos3.lon,
            pos4.lat,
            pos4.lon,
            pos5.lat,
            pos5.lon
        ], (err, response) => {
            if (err) {
                return res.status(200).json({
                    status: 'fail',
                    message: err,
                });
            }


            return res.status(200).json({
                status: 'success',
                data: response,
            });

        });

};

exports.getStaff = async (req, res, next) => {
    const {shopId} = req.body;
    connection.query('SELECT S.*, ROUND((SELECT SUM(rating) FROM staffratings WHERE staffId = S.id) / (SELECT COUNT(staffId) FROM staffratings WHERE staffId = S.id)) AS rating FROM staffs S WHERE S.shopId = ?', [shopId], (err, response) => {
        if (err) {
            return res.status(200).json({
                status: 'fail',
                message: err,
            });
        }
        return res.status(200).json({
            status: 'success',
            data: response,
        });

    });

};

exports.availableStaff = async (req, res, next) => {
    const {shopId} = req.body;
    connection.query('SELECT staffs.*, availabletimesforstaffs.staffId, availabletimesforstaffs.time, availabletimesforstaffs.dayId, availabletimesforstaffs.availability FROM staffs INNER JOIN availabletimesforstaffs ON staffs.id = availabletimesforstaffs.staffId WHERE staffs.id = availabletimesforstaffs.staffId AND staffs.shopId = ?', [shopId], (err, response) => {
        if (err) {
            return res.status(200).json({
                status: 'fail',
                message: err,
            });
        }
        return res.status(200).json({
            status: 'success',
            data: response,
        });

    });

};

exports.rateShop = async (req, res, next) => {
    const {shopId, rate, userId, appId} = req.body;
    const date = new Date();
    connection.query('INSERT INTO ratings(shopId, rating, userId, appId, date) VALUES(?, ?, ?, ?, ?)', [shopId, rate, userId, appId, date], (err, response) => {
        if (err) {
            return res.status(200).json({
                status: 'fail',
                message: err,
            });
        }
        return res.status(200).json({
            status: 'success'
        });

    });

};

exports.getServices = async (req, res, next) => {
    const {shopId} = req.body;

    connection.query('SELECT services.service AS serviceName, services.icon as icon, providedservices.price as price FROM shops INNER JOIN ( providedservices INNER JOIN ( services ) ON providedservices.serviceId = services.id ) ON shops.id = providedservices.shopId WHERE shops.id = ? GROUP BY services.service', [shopId], (err, response) => {
        if (err) {
            return res.status(200).json({
                status: 'fail',
                message: err,
            });
        }
        return res.status(200).json({
            status: 'success',
            data: response,
        });

    });

};

exports.getStaffServices = async (req, res, next) => {
    const {staffId} = req.body;

    connection.query('SELECT PS.*, S.*, ser.service AS serviceName, ser.icon FROM providedservicesbystaff AS PS INNER JOIN providedservices AS S ON PS.providedServiceId = S.id INNER JOIN services AS ser ON S.serviceId = ser.id WHERE	S.serviceId = PS.providedServiceId AND PS.staffId = ?', [staffId], (err, response) => {
        if (err) {
            return res.status(200).json({
                status: 'fail',
                message: err,
            });
        }
        return res.status(200).json({
            status: 'success',
            data: response,
        });

    });

};

exports.getGallery = async (req, res, next) => {
    const {shopId} = req.body;
    connection.query('SELECT * FROM gallery WHERE shopId = ?', [shopId], (err, response) => {
        if (err) {
            return res.status(200).json({
                status: 'fail',
                message: err,
            });
        }
        return res.status(200).json({
            status: 'success',
            data: response,
        });

    });

};

exports.getShop = (req, res, next) => {
    const {shopId} = req.body;
    connection.query(
        `SELECT CEIL(RAND() * (100 - 10) + 10)                                 as price,
                CEIL(RAND() * (2 - 0))                                         as status,
                S.*,
                ROUND((SELECT SUM(rating) FROM ratings WHERE shopId = S.id) /
                      (SELECT COUNT(userId) FROM ratings WHERE shopId = S.id)) AS rating
         FROM shops S
         WHERE S.id = ?`,
        [shopId],
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
                    message: `There are no shop with id : ${shopId}...`,
                });
            }
        }
    );
};

