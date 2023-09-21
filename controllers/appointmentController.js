const connection = require('../db/db');
const {getQuery} = require('../helpers/queries');
const nodemailer = require('nodemailer');
const OneSignal = require('onesignal-node');

const sendNotification = function (data) {
    const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Basic Yjk5NTZjY2YtNmMyMC00MmIwLWFkNzAtZjU0ZjA2ZjQ3M2Rm"
    };

    let options = {
        host: "onesignal.com",
        port: 443,
        path: "/api/v1/notifications",
        method: "POST",
        headers: headers
    };

    let https = require('https');
    let req = https.request(options, function (res) {
        res.on('data', function (data) {

        });
    });

    req.on('error', function (e) {
        console.log("ERROR:");
        console.log(e);
    });

    req.write(JSON.stringify(data));
    req.end();
};

/*jimir3x*/

// the "j" means jimi
const jQuery = (sql, args = []) => {
    return new Promise((resolve, reject) => {
        if (args.length > 0) {
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

exports.createAppointment = async (req, res) => {
    const {date, paymentId, shopId, userId, dayId, services} = req.body;

    if (services.length === 0 || !date || !paymentId || !shopId || !userId) {
        res.json({
            status: "error",
            message: "Please fill the necessary fields!"
        });
        return;
    }
    const [sDate, sTime] = date.split(" ");

    const newDate = new Date(`${sDate}T${sTime}Z`).getTime();

    const currentTime = new Date().getTime();
    console.log("appointment create");
    if (currentTime > newDate) {
        res.json({
            status: "error",
            message: "You can't create appointment in the past!"
        });
        return;
    }

    const before1Hour = new Date(newDate - 3600 * 1000);
    let [before1HourDate, before1HourTime] = before1Hour.toISOString().split("T")
    before1HourTime = before1HourTime.split(".")[0]

    const after1Hour = new Date(newDate + 3600 * 1000);
    let [after1HourDate, after1HourTime] = after1Hour.toISOString().split("T")
    after1HourTime = after1HourTime.split(".")[0]

    const checkUserSql = `
        SELECT id
        FROM appointments
        WHERE userId = ?
          AND date
            > "${before1HourDate} ${before1HourTime}"
          AND date
            < "${after1HourDate} ${after1HourTime}"
    `;
    const checkUserQ = await jQuery(checkUserSql, [userId]);
    if (checkUserQ.length > 0) {
        res.json({
            status: "error",
            message: "You already have an appointment for a near future."
        });
        return;
    }

    let [staffCount] = await jQuery("SELECT COUNT(id) AS staffCount FROM staffs WHERE shopId = ?", [shopId]);
    staffCount = staffCount.staffCount;

    const checkBarberSql = `
        SELECT COUNT(id) AS appointmentCount
        FROM appointments
        WHERE shopId = ?
          AND date = ?
    `;
    let [checkBarberQ] = await jQuery(checkBarberSql, [shopId, date]);
    const appointmentCount = checkBarberQ.appointmentCount;

    if (staffCount <= appointmentCount) {
        res.json({
            status: "error",
            message: "There is no available appointment in that time."
        });
        return;
    }

    const createAppointmentSql = `
        INSERT INTO appointments (date, paymentId, shopId, userId)
        VALUES (?, ?, ?, ?)
    `;

    const {affectedRows, insertId} = await jQuery(createAppointmentSql, [date, paymentId, shopId, userId]);
    if (affectedRows > 0) {
        let detailsSql = "INSERT INTO appointmentdetails (staffId, serviceId, appointmentId) VALUES ";
        const detailsArgs = [];
        const servicesLen = services.length;
        for (let i = 0; i < servicesLen; i++) {
            const {staffId, serviceId} = services[i];
            detailsArgs.push(staffId, serviceId);
            detailsSql += `(?, ?, ${insertId})`;
            if (i !== servicesLen - 1) detailsSql += ", ";
            else detailsSql += ";";
        }

        const detailsQ = await jQuery(detailsSql, detailsArgs);
        if (detailsQ.affectedRows > 0) {
            const shop = await jQuery("SELECT userId FROM shops WHERE id = ?", [shopId]);

            const user = await jQuery("SELECT id FROM users WHERE id = ?", [shop[0].userId]);
            const message = {
                app_id: "f2a42536-bcaf-439a-b340-f627d357e5b9",
                contents: {"en": " You have a new pending appointment"},
                headings: {"en": "New Appointment!"},
                template_id: '5bb38172-363f-4bbe-afcd-f8d9f7ade744',
                channel_for_external_user_ids: "push",
                include_external_user_ids: [user[0].id.toString()]
            };

            /*****************************EMAIL NOTIFICATION************************************/

            const transporter = nodemailer.createTransport({
                host: 'blizzard.mxrouting.net',
                port: 465,
                secure: true,
                auth: {
                    user: 'no-reply@friseurie.com',
                    pass: '{RbA#&(HjL3z'
                },
            });

            const mailOptions = {
                from: 'no-reply@friseurie.com',
                to: user[0].email,
                subject: 'You Have A New Appointment',
                text: `\nYou have a new pending appointment! You can check your appointment details on Friseurie Mobile`
            };

            await transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);

                }
            });
            /*****************************EMAIL NOTIFICATION************************************/

            sendNotification(message);

            res.json({
                status: "success"
            });
            return;
        } else {
            res.json({
                status: "error",
                message: "Something's went wrong."
            });
            return;
        }
    } else {
        res.json({
            status: "error",
            message: "Something's went wrong."
        });
        return;
    }

    // Check the user for appointment
    // Check the shop for appointment
    // Create an appointment
    // Add the details to the details table


};

exports.barberAppointmentsByDate = async (req, res) => {
    const {shopId, date, page} = req.body;
    let curPage = page;
    if (!curPage) curPage = 1;
    const perPage = 3;
    const startAt = perPage * (curPage - 1);

    const sql = `
        SELECT A.id, A.date, A.status, U.firstName, U.lastName, P.method
        FROM appointments A
                 INNER JOIN users U ON U.id = A.userId
                 INNER JOIN paymentmethods P ON P.id = A.paymentId
        WHERE DATE (A.date) = ?
          AND A.shopId = ?
        ORDER BY A.date, U.firstName LIMIT ${startAt}, ${perPage}
    `;

    const data = await jQuery(sql, [date, shopId, page]);
    const dataLen = data.length;
    if (dataLen > 0) {
        for (let i = 0; i < dataLen; i++) {
            const id = data[i].id;
            let priceSql = `
                SELECT SUM(PS.price) AS price
                FROM providedservices PS
                         INNER JOIN appointmentdetails APD ON APD.serviceId = PS.serviceId
                WHERE APD.appointmentId = ${id}
                  AND PS.shopId = ${shopId}
            `;

            let [price] = await jQuery(priceSql);
            data[i].price = price.price;

            data[i].services = await jQuery(`
                SELECT S.id, S.service
                FROM services S
                         INNER JOIN providedservices PS ON PS.serviceId = S.id
                         INNER JOIN appointmentdetails APD ON APD.serviceId = PS.serviceId
                WHERE APD.appointmentId = ${id}
                GROUP BY service
            `);
        }
    }


    res.json(data)
}

exports.bookNowScreen = async (req, res, next) => {
    const {shopId, date, day} = req.body;
    const data = {shopInfo: {}, staffs: [], services: [], times: []};

    const [theShop] = await jQuery(`
        SELECT shopName, address
        FROM shops
        WHERE id = ?
    `, [shopId]);

    data.shopInfo = theShop;

    data.staffs = await jQuery(`
        SELECT S.id,
               S.firstName,
               S.lastName,
               S.avatar,
               S.shopId,
               (SELECT SUM(rating) / COUNT(rating) FROM staffratings WHERE staffId = S.id) AS rating
        FROM staffs S
                 LEFT JOIN staffratings SR ON SR.staffId = S.id
                 INNER JOIN availabletimesforstaffs AVTS ON AVTS.staffId = S.id
        WHERE S.shopId = ?
          AND S.isDeleted = 0
          AND AVTS.dayId = ?
          AND AVTS.availability = 1
        GROUP BY S.id
    `, [shopId, day]);


    data.times = await jQuery(`
        SELECT AT.id, AT.time
        FROM availabletimes AT
    INNER JOIN shops S
        ON S.id = AT.shopId
        WHERE S.id = ?
          AND AT.dayId = ?
        ORDER BY AT.id
    `, [shopId, day]);

    const dataTimesLen = data.times.length
    let appointmentsCount = {}
    const dataStaffsLen = data.staffs.length;
    for (let i = 0; i < dataStaffsLen; i++) {
        const staffId = data.staffs[i].id;
        const shopId = data.staffs[i].shopId;
        data.staffs[i].services = await jQuery(`
            SELECT S.id, S.service, S.icon, PS.price
            FROM providedservicesbystaff PSBS
                     INNER JOIN services S ON S.id = PSBS.serviceId
                     INNER JOIN providedservices PS ON PS.serviceId = S.id
            WHERE PSBS.staffId = ?
              AND PS.shopId = ?
        `, [staffId, shopId]);


        //staff Times
        data.staffs[i].timesBusy = await jQuery(`
            SELECT appointments.id AS ADid,
                   appointmentdetails.staffId,
                   appointments.date
            FROM appointmentdetails
                     INNER JOIN
                 appointments
                 ON
                     appointmentdetails.appointmentId = appointments.id
                     INNER JOIN
                 availabletimes
            WHERE appointmentdetails.appointmentId = appointments.id
              AND availabletimes.shopId = appointments.shopId
              AND appointments.date LIKE '${"%" + date + "%"}'
              AND appointmentdetails.staffId = ?
            GROUP by appointments.id
        `, [staffId]);
    }

    data.services = await jQuery(`
        SELECT PS.id, S.service, PS.price, S.icon
        FROM providedservices PS
                 INNER JOIN services S ON S.id = PS.serviceId
        WHERE PS.shopId = ?
    `, [shopId]);


    for (let i = 0; i < dataTimesLen; i++) {
        const {time} = data.times[i];

        const [staffsCount] = await jQuery(`
            SELECT COUNT(S.id) AS staffsCount
            FROM staffs S
                     INNER JOIN availabletimesforstaffs AVTS ON AVTS.staffId = S.id
                     INNER JOIN shops SH ON SH.id = S.shopId
            WHERE AVTS.dayId = ?
              AND S.isDeleted = 0
              AND SH.id = ?
        `, [day, shopId]);

        const [appointmentsCount] = await jQuery(`
            SELECT COUNT(A.id) AS appointmentsCount
            FROM appointments A
            WHERE A.shopId = ?
              AND A.date = ?
        `, [shopId, date + " " + time]);

        const stfC = staffsCount.staffsCount;
        const appC = appointmentsCount.appointmentsCount;
        if (appC === 0) {
            data.times[i].available = true;
        } else {
            data.times[i].available = false;
        }
    }

    res.status(200).json(data);
}

exports.jimiPractice = async (req, res, next) => {
    // ses-smtp-user.20210722-145533
    // SMTP Username: AKIAYGFD3KLZ45GIMTCV
    // SMTP Password: BNk243xaXJKI842fg9ljE8J5kltiYwyJsmQJcUMXlhXB

    const transporter = nodemailer.createTransport({
        host: 'blizzard.mxrouting.net',
        port: 465,
        secure: true,
        auth: {
            user: 'no-reply@friseurie.com',
            pass: '{RbA#&(HjL3z'
        },
    });

    const mailOptions = {
        from: 'no-reply@friseurie.com',
        to: "andplusorminus@gmail.com",
        subject: 'Verify Your Account',
        text: `\nThanks for your registration! You need to complete one more step to get full access to your account. Click on the link below to activate your account.\nLink: asdasdasdasdasd`
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            data = {"status": "error", "message": "mail error"};
            return res.status(200).send(data);
        } else {
            data = {"status": "success", "message": "Success"};
            return res.status(200).send(data);
        }
    });
}

exports.adsForUsers = async (req, res) => {
    const {userId} = req.body;

    // check is there any ad
    const [isThereAnyAd] = await jQuery("SELECT COUNT(id) AS ads FROM ads");
    if (isThereAnyAd.ads == 0) {
        res.json({message: "There's no ad to show"});
        return
    }

    // check any ads have been shown to the user in the last 24 hours
    const currentTime = new Date().getTime();
    const _24HoursAgo = currentTime - 3600 * 1000 * 24;
    const date = new Date();
    const formattedDate = date
        .toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '')
        .slice(0, 10);
    const [adLast24ForUser] = await jQuery(`
        SELECT COUNT(adsId) AS ads
        FROM adsforusers
        WHERE date
            > '${new Date(_24HoursAgo).toISOString()}'
          AND date
            < '${formattedDate}'
          AND userId = ?
    `, [userId]);
    if (adLast24ForUser.ads > 0) {
        res.json({message: "This user has already been shown an ad in the last 24 hours"});
        return;
    }

    // get a random ad that user has never seen before
    const randomAdUserHasNeverSeen = await jQuery(`
        SELECT id, url
        FROM ads
        WHERE id NOT IN (SELECT adsId FROM adsforusers WHERE userId = ?)
        ORDER BY RAND() LIMIT 1
    `, [userId]);
    if (randomAdUserHasNeverSeen.length > 0) {
        const {id, url} = randomAdUserHasNeverSeen[0];
        const addUserWithAd = await jQuery(`
            INSERT INTO adsforusers
            VALUES (${id}, ?, '${formattedDate}')
        `, [userId]);
        if (addUserWithAd.affectedRows > 0) {
            res.json({id, url})
            return;
        } else {
            res.json({status: "error", message: "Something's went wrong"})
            return;
        }
    }

    // get a random ad that user hasn't seen in the last 24 hours
    const randomAdUserHasSeenBefore = await jQuery(`
        SELECT A.*
        FROM ads A
                 INNER JOIN adsforusers ADFU ON ADFU.adsId = A.id
        WHERE ADFU.date < '${formattedDate}'
          AND ADFU.userId = ?
        ORDER BY RAND() LIMIT 1
    `, [userId]);
    if (randomAdUserHasSeenBefore.length > 0) {
        const {id, url} = randomAdUserHasSeenBefore[0];
        const updateSeenDate = await jQuery(`
            UPDATE adsforusers
            SET date = '${formattedDate}'
            WHERE adsId = ${id}
              AND userId = ?
        `, [userId]);
        if (updateSeenDate.affectedRows > 0) {
            res.json({id, url});
            return;
        } else {
            res.json({status: "error", message: "Something's went wrong"});
            return;
        }
    }
}

exports.getShopsByLocation = async (req, res) => {
    const {latitude, longitude} = req.body;

    const range = 1;

    const date = new Date();
    const day = date.getDay();
    const ymd = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

    // positions
    const pos1 = {lat: latitude - range, lon: longitude - range}
    const pos2 = {lat: latitude - range, lon: longitude + range}
    const pos3 = {lat: latitude + range, lon: longitude - range}
    const pos4 = {lat: latitude + range, lon: longitude + range}

    const [sumOfPricesOfShops] = await jQuery(`
        SELECT SUM(price) AS totalPrice
        FROM providedservices
    `);
    const {totalPrice} = sumOfPricesOfShops;

    const sql = `
        SELECT S.id,
               S.shopName,
               S.address,
               S.avatar,
               S.latitude,
               S.longitude,
               (
                   SELECT SUM(R.rating) / COUNT(R.rating)
                   FROM ratings R
                            INNER JOIN appointments A ON A.id = R.appId
                   WHERE A.shopId = S.id
               ) AS rating,
               (
                   SELECT CASE
                              WHEN ((SUM(price) * 100) / ${totalPrice}) < 36 THEN 'cheap'
                              WHEN ((SUM(price) * 100) / ${totalPrice}) < 66 THEN 'average'
                              ELSE 'expensive'
                              END
                   FROM providedservices
                   WHERE shopId = S.id
               ) AS price,
               (
                   CASE
                       WHEN ((SELECT COUNT(id) FROM availabletimes WHERE shopId = S.id AND dayId = ${day}) *
                             (SELECT COUNT(id) FROM staffs WHERE shopId = S.id AND isDeleted = 0) -
                             (SELECT COUNT(id) FROM appointments WHERE shopId = S.id AND DATE (date) = '${ymd}')) > 0
        THEN 'available'
        ELSE 'full'
        END
        ) AS availability, S.id as shopId
    FROM shops S
    WHERE latitude >
        ${pos1.lat}
        AND
        longitude
        >
        ${pos1.lon}
        AND
        latitude
        >
        ${pos2.lat}
        AND
        longitude
        <
        ${pos2.lon}
        AND
        latitude
        <
        ${pos3.lat}
        AND
        longitude
        >
        ${pos3.lon}
        AND
        latitude
        <
        ${pos4.lat}
        AND
        longitude
        <
        ${pos4.lon}
    `;

    const shops = await jQuery(sql);

    res.json(shops);
}

exports.searchBarberShops = async (req, res) => {
    const {searchText, sortPrice, rating, available, filterPrice, serviceId} = req.body;
    const date = new Date();
    const day = date.getDay();
    const ymd = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

    const [sumOfPricesOfShops] = await jQuery(`
        SELECT SUM(price) AS totalPrice
        FROM providedservices
    `);
    const {totalPrice} = sumOfPricesOfShops;

    let sql = `
        SELECT S.id as shopId,
               S.id,
               S.shopName,
               S.address,
               S.avatar,

               (
                   SELECT CASE
                              WHEN ((SUM(price) * 100) / ${totalPrice}) < 36 THEN 'cheap'
                              WHEN ((SUM(price) * 100) / ${totalPrice}) < 66 THEN 'average'
                              ELSE 'expensive'
                              END
                   FROM providedservices
                   WHERE shopId = S.id
               )    AS price,
               (
                   CASE
                       WHEN ((SELECT COUNT(id) FROM availabletimes WHERE shopId = S.id AND dayId = ${day}) *
                             (SELECT COUNT(id) FROM staffs WHERE shopId = S.id AND isDeleted = 0) -
                             (SELECT COUNT(id) FROM appointments WHERE shopId = S.id AND DATE (date) = '${ymd}')) > 0
                 THEN 'available'
               ELSE 'full'
        END
        ) AS availability, S.id as shopId,
           IFNULL((
                    SELECT SUM(R.rating)/COUNT(R.rating) FROM ratings R
                    INNER JOIN appointments A ON A.id = R.appId
                    WHERE A.shopId = S.id
                  ),0) as rating
    FROM shops S
    WHERE S.shopName LIKE ?
    OR S.address LIKE ?
    `;

    if (rating === "asc") {
        sql = sql + ' ORDER by rating ASC';
    } else if (rating === "desc") {
        sql = sql + ' ORDER by rating DESC';
    }

    let searchResult = await jQuery(sql, [`%${searchText}%`, `%${searchText}%`]);

    for (i = 0; i < searchResult.length; i++) {
        searchResult[i].services = await jQuery(`SELECT serviceId
                                                 FROM providedservices
                                                 WHERE shopId = ?`, [searchResult[i].shopId]);
    }

    if (available) {
        searchResult = [...searchResult].filter(el => el.availability === 'available')
    }

    if (serviceId) {
        searchResult = [...searchResult].filter(el => el.services.find(service => service.serviceId === serviceId))
    }

    if (filterPrice) {
        console.log(filterPrice);
        const cheap = filterPrice.cheap;
        const average = filterPrice.average;
        const expensive = filterPrice.expensive;
        console.log(cheap);
        if (cheap) {
            searchResult = [...searchResult].filter(el => el.price === 'cheap')
        } else if (average) {
            searchResult = [...searchResult].filter(el => el.price === 'average')
        } else if (expensive) {
            searchResult = [...searchResult].filter(el => el.price === 'expensive')
        } else if (cheap && average) {
            searchResult = [...searchResult].filter(el => el.price === "average" || el.price === "cheap")
        } else if (average && expensive) {
            searchResult = [...searchResult].filter(el => el.price === "expensive" || el.price === "average")
        } else if (cheap && expensive) {
            searchResult = [...searchResult].filter(el => el.price === "expensive" || el.price === "cheap")
        } else if (cheap && expensive && average) {
            searchResult = [...searchResult].filter(el => el.price === 'average' || el.price === "expensive" || el.price === "cheap")
        } else {
            searchResult = searchResult;
        }

    }


    if (sortPrice === "asc") {
        let sortedArr = [];
        while (sortedArr.length !== searchResult.length) {
            let middlewareCheap = [...searchResult].filter(el => el.price === 'cheap');
            let middlewareAverage = [...searchResult].filter(
                el => el.price === 'average'
            );
            let middlewareExpensive = [...searchResult].filter(
                el => el.price === 'expensive'
            );
            sortedArr = [...sortedArr, ...middlewareCheap];
            sortedArr = [...sortedArr, ...middlewareAverage];
            sortedArr = [...sortedArr, ...middlewareExpensive];
        }
        res.json(sortedArr);
    } else if (sortPrice === "desc") {

        let sortedArr = [];
        while (sortedArr.length !== searchResult.length) {
            let middlewareCheap = [...searchResult].filter(el => el.price === 'cheap');
            let middlewareAverage = [...searchResult].filter(
                el => el.price === 'average'
            );
            let middlewareExpensive = [...searchResult].filter(
                el => el.price === 'expensive'
            );

            sortedArr = [...sortedArr, ...middlewareExpensive];
            sortedArr = [...sortedArr, ...middlewareAverage];
            sortedArr = [...sortedArr, ...middlewareCheap];
        }
        res.json(sortedArr);

    } else {
        res.json(searchResult);
    }

}

exports.userAppointments = async (req, res) => {
    const {userId} = req.body;
    console.log("get appointments");
    const appointments = await jQuery(`
        SELECT S.shopName,
               S.address,
               S.avatar,
               S.id                                                                 AS shopId,
               A.id                                                                 AS appId,
               A.date,
               A.status,
               (SELECT SUM(rating) / COUNT(rating) FROM ratings WHERE appId = A.id) AS rating
        FROM shops S
                 INNER JOIN appointments A ON A.shopId = S.id
        WHERE A.userId = ?
        ORDER BY A.date DESC
    `, [userId]);

    res.json(appointments);
}

exports.increaseReferenced = async (req, res) => {
    const {refCode} = req.body;

    const incRef = await jQuery(`
        UPDATE users
        SET referenced = referenced + 1
        WHERE refCode = ?
    `, [refCode]);

    if (incRef.affectedRows > 0) {
        res.json({status: "success"});
    } else {
        res.json({status: "error", message: "Something's went wrong!"});
    }


}

exports.barberRankingList = async (req, res) => {
    const {limit} = req.body;

    const [sumOfPricesOfShops] = await jQuery(`
        SELECT SUM(price) AS totalPrice
        FROM providedservices
    `);
    const {totalPrice} = sumOfPricesOfShops;

    const rankingList = await jQuery(`
        SELECT S.id as shopId,
               S.shopName,
               S.address,
               S.avatar,
               (
                   SELECT SUM(R.rating) / COUNT(R.rating)
                   FROM ratings R
                            INNER JOIN appointments A ON A.id = R.appId
                   WHERE A.shopId = S.id
               )    AS rating,
               (
                   SELECT CASE
                              WHEN ((SUM(price) * 100) / ${totalPrice}) < 36 THEN 'cheap'
                              WHEN ((SUM(price) * 100) / ${totalPrice}) < 66 THEN 'average'
                              ELSE 'expensive'
                              END
                   FROM providedservices
                   WHERE shopId = S.id
               )    AS price
        FROM shops S
        ORDER BY (
                     SELECT SUM(R.rating) * 0.7 + COUNT(R.rating) * 0.3
                     FROM ratings R
                              INNER JOIN appointments A ON A.id = R.appId
                     WHERE A.shopId = S.id
                 ) DESC LIMIT ?
    `, [limit]);

    res.json(rankingList);
}

exports.setAppointmentStatus = async (req, res) => {
    const {appId, status} = req.body;

    const updateStatus = await jQuery(`
        UPDATE appointments
        SET status = ?
        WHERE id = ?
    `, [status, appId]);

    let userId;
    const result = await jQuery("SELECT userId, shopId, date FROM appointments WHERE id = ?", [appId]);
    const shop = await jQuery("SELECT shopName FROM shops WHERE id = ?", [result[0].shopId]);
    userId = result[0].userId;
    let shopName = shop[0].shopName;
    console.log("User Id: " + userId);
    if (updateStatus.affectedRows > 0) {

        if (status === 1) {
            /////
            const formattedDate = result[0].date
                .toISOString()
                .replace(/T/, ' ')
                .replace(/\..+/, '')
                .slice(0, 10);
            const message = {
                app_id: "f2a42536-bcaf-439a-b340-f627d357e5b9",
                contents: {
                    "en": shopName + " has approved your appointment on " + formattedDate,
                    "de": shopName + " hat Ihren Termin am " + formattedDate + "genehmigt"
                },
                headings: {"en": "Appointment Approved!", "de": "Termin genehmigt!"},
                template_id: '5bb38172-363f-4bbe-afcd-f8d9f7ade744',
                channel_for_external_user_ids: "push",
                include_external_user_ids: [userId.toString()]
            };

            sendNotification(message);
            //////

        }
        if (status === 2) {
            /////
            const formattedDate = result[0].date
                .toISOString()
                .replace(/T/, ' ')
                .replace(/\..+/, '')
                .slice(0, 10);
            const message = {
                app_id: "f2a42536-bcaf-439a-b340-f627d357e5b9",
                contents: {
                    "en": shopName + " has denied your appointment on " + formattedDate,
                    "de": shopName + "hat Ihren Termin am " + formattedDate + " abgelehnt"
                },
                headings: {"en": "Appointment Denied", "de": "Termin abgelehnt"},
                template_id: '5bb38172-363f-4bbe-afcd-f8d9f7ade744',
                channel_for_external_user_ids: "push",
                include_external_user_ids: [userId.toString()]
            };

            sendNotification(message);
            //////

        } else if (status === 3) {
            /////
            const formattedDate = result[0].date
                .toISOString()
                .replace(/T/, ' ')
                .replace(/\..+/, '')
                .slice(0, 10);
            const message = {
                app_id: "f2a42536-bcaf-439a-b340-f627d357e5b9",
                contents: {
                    "en": "Rate your appointment taken on " + formattedDate + " from " + shopName,
                    "de": "Bewerten Sie Ihren am " + formattedDate + " angenommenen Termin von " + shopName
                },
                headings: {"en": "Rate Your Appointment", "de": "Bewerten Sie Ihren Termin"},
                template_id: '5bb38172-363f-4bbe-afcd-f8d9f7ade744',
                channel_for_external_user_ids: "push",
                app_url: "friseurie://app/appointments",
                include_external_user_ids: [userId.toString()]
            };

            sendNotification(message);
            //////

        }

        res.json({status: "success"});
    } else {
        res.json({status: "error", message: "Something's went wrong!"});
    }
}

exports.getAShop = async (req, res) => {
    const {shopId} = req.body;

    const [sumOfPricesOfShops] = await jQuery(`
        SELECT SUM(price) AS totalPrice
        FROM providedservices
    `);
    const {totalPrice} = sumOfPricesOfShops;
    const campaigns = await jQuery(`SELECT *
                                    FROM campaigns
                                    WHERE shopId = ?`,
        [shopId]);
    let shop = await jQuery(`
        SELECT S.id,
               S.shopName,
               S.address,
               S.avatar,
               S.times,
               (
                   SELECT SUM(R.rating) / COUNT(R.rating)
                   FROM ratings R
                            INNER JOIN appointments A ON A.id = R.appId
                   WHERE A.shopId = S.id
               ) AS rating,
               (
                   SELECT CASE
                              WHEN ((SUM(price) * 100) / ${totalPrice}) < 36 THEN 'cheap'
                              WHEN ((SUM(price) * 100) / ${totalPrice}) < 66 THEN 'average'
                              ELSE 'expensive'
                              END
                   FROM providedservices
                   WHERE shopId = S.id
               ) AS price
        FROM shops S
        WHERE S.id = ?
    `, [shopId]);

    shop = shop.length > 0 && shop[0];

    shop.gallery = await jQuery(`
        SELECT id, src
        FROM gallery
        WHERE shopId = ?
    `, [shopId]);

    shop.staffs = await jQuery(`
        SELECT S.id,
               S.firstName,
               S.lastName,
               S.avatar,
               (
                   SELECT SUM(rating) / COUNT(rating)
                   FROM staffratings
                   WHERE staffId = S.id
               ) AS rating
        FROM staffs S
        WHERE S.shopId = ?
          AND isDeleted = 0
    `, [shopId]);

    shop.services = await jQuery(`
        SELECT S.id, S.service, S.icon, PS.price, S.service_de
        FROM services S
                 INNER JOIN providedservices PS ON PS.serviceId = S.id
        WHERE PS.shopId = ?
    `, [shopId]);

    shop.campaigns = campaigns;
    res.json(shop);
}

exports.updateUserAvatar = async (req, res) => {
    const {id, avatar} = req.body;

    const updateAvatar = await jQuery(`
        UPDATE users
        SET avatar = ?
        WHERE id = ?
    `, [`${avatar}`, id]);

    if (updateAvatar.affectedRows > 0) {
        res.json({status: "success"});
    } else {
        res.json({status: "error", message: "Somethin's went wrong"});
    }

}

exports.userRateAppointment = async (req, res) => {
    const {rating, appId} = req.body;

    //const date = new Date().toISOString();
    const date = new Date();
    const formattedDate = date
        .toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '')
        .slice(0, 10);

    const rate = await jQuery(`
        INSERT INTO ratings
        VALUES (?, '${formattedDate}', ?)
    `, [rating, appId]);

    if (rate.affectedRows > 0) {
        const updateAppoStatus = await jQuery(`
            UPDATE appointments
            SET status = 4
            WHERE id = ?
        `, [appId]);

        if (updateAppoStatus.affectedRows > 0) {
            res.json({status: "success"});
        } else {
            res.json({status: "error", message: "Something's went wrong!"});
        }
    } else {
        res.json({status: "error", message: "Something's went wrong!"});
    }

}

/*jimir3x*/

exports.getAppointments = (req, res, next) => {
    const {userId} = req.body;
    console.log("get appointments");
    connection.query("SELECT * FROM appointments WHERE userId = ?", [userId], (err, result) => {
        if (err) {
            return res.status(404).json({
                status: "fail",
                message: err,
            });
        }

        res.status(200).json({
            status: "success",
            appointments: result,
        });
    });
};

exports.getAppointment = (req, res, next) => {
    const {appId} = req.body;
    connection.query(
        `SELECT *
         FROM appointments
         WHERE id = ?`,
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
                    appDetails: result,
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

exports.appointmentHistory = (req, res, next) => {
    const {userId} = req.body;
    connection.query(
        `SELECT shops.shopName,
                appointmentdetails.appointmentId,
                shops.id as "shopId",
                appointments.userId,
                appointments.status,
                appointments.date,
                shops.avatar AS "shopBanner"
         from shops
                  inner join staffs on shops.id = staffs.shopId
                  inner join appointmentdetails on appointmentdetails.staffId = staffs.id
                  inner join appointments on appointments.id = appointmentdetails.appointmentId
         WHERE appointments.userId = ?; `,
        [userId],
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
                    appDetails: result,
                });
            } else {
                res.status(200).json({
                    status: 'error',
                    message: `There are no appointment with user id : ${userId}...`,
                });
            }
        }
    );
};

exports.todaysAppointments = (req, res, next) => {
    const {shopId} = req.body;
    const date = new Date();
    const formattedDate = date
        .toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '')
        .slice(0, 10);
    connection.query(
        `SELECT COUNT(id) as appointments
         FROM appointments
         WHERE date LIKE '${formattedDate}%' AND shopId = ?`,
        [shopId],
        (err, result) => {
            if (err) {
                return res.status(404).json({
                    status: 'fail',
                    message: err,
                });
            }
            if (result.length !== 0) {
                /***** ********/
                res.status(200).json({
                    status: 'success',
                    count: result[0].appointments
                });

                /***** *******/
            } else {
                res.status(200).json({
                    status: 'error',
                    message: `No appointments to this date ${formattedDate}`,
                });
            }
        }
    );
};

exports.checkUpcomingAppointments = async (req, res, next) => {
    let newDate = new Date().toISOString();
    let after1Hour = new Date(new Date().getTime() + 3600 * 1000).toISOString();
    newDate = `${newDate.split('T')[0]} ${newDate.split('T')[1].split('.')[0]}`;
    after1Hour = `${after1Hour.split('T')[0]} ${after1Hour.split('T')[1].split('.')[0]}`;
    console.log(newDate);
    const query = await jQuery("SELECT date, userId, id, lastOneHourNotify as ntfy FROM appointments WHERE date BETWEEN ? AND ? ", [newDate, after1Hour]);
    console.log("Checking upcoming appointments.");
    if (query.length > 0) {
        let datares;
        for (let i = 1; i <= query.length; i++) {
            if (query[i - 1].ntfy === 0) {
                const message = {
                    app_id: "f2a42536-bcaf-439a-b340-f627d357e5b9",
                    contents: {
                        "en": "You have an appointment upcoming in 1 hour",
                        "de": "Du hast in 1 Stunde einen Termin"
                    },
                    headings: {"en": "Upcoming Appointment!", "de": "Kommender Termin!"},
                    template_id: '5bb38172-363f-4bbe-afcd-f8d9f7ade744',
                    channel_for_external_user_ids: "push",
                    include_external_user_ids: [query[i - 1].userId.toString()]
                };
                const userDetails = await jQuery(`SELECT email
                                                  FROM users
                                                  WHERE id = ?`, [query[i - 1].userId]);

                /*****************************EMAIL NOTIFICATION************************************/
                const transporter = nodemailer.createTransport({
                    host: 'blizzard.mxrouting.net',
                    port: 465,
                    secure: true,
                    auth: {
                        user: 'no-reply@friseurie.com',
                        pass: '{RbA#&(HjL3z'
                    },
                });

                const mailOptions = {
                    from: 'no-reply@friseurie.com',
                    to: userDetails[0].email,
                    subject: 'You Have Appointments',
                    text: `\nYou have an appointment upcoming in 1 hour, you can check your appointments details on Friseurie Mobile`
                };

                await transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);

                    }
                });
                /*****************************EMAIL NOTIFICATION************************************/
                const updateNotify = await jQuery(`UPDATE appointments
                                                   SET lastOneHourNotify = 1
                                                   WHERE id = ?`, [query[i - 1].id]);
                console.log("Notification sent to " + query[i - 1].userId);
                sendNotification(message);
                datares = "Upcoming appointment notifications has been sent";
            } else {
                datares = "There is no upcoming events for this time.";
            }
        }
        res.status(200).json({
            status: "success",
            message: datares
        });

    } else {
        res.status(200).json({
            status: "success",
            message: "NO upcoming events found."
        })
    }

}

exports.deleteAppointment = (req, res, next) => {
    const {appId} = req.body;
    connection.query(`DELETE
                      FROM appointmentdetails
                      WHERE appointmentId = ?`, [appId], (err) => {
        if (err) throw err;
    })

    connection.query(`DELETE
                      FROM appointments
                      WHERE id = ?`, [appId], (err, res2) => {
        if (err) {
            res.status(200).json({
                status: 'fail',
                message: err,
            });
        } else {
            if (res2.affectedRows === 0) {
                res.status(200).json({
                    status: 'error',
                    data: `Appointment with id ${appId} is not found...`
                });
            } else {
                res.status(200).json({
                    status: 'success',
                });
            }
        }
    });

};




