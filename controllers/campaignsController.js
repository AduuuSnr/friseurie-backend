const connection = require('../db/db');
const {getQuery} = require('../helpers/queries');
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
exports.getCampaigns = (req, res) => {
    const {limit = 5, offset = 0, genderId} = req.body;

    let gender = genderId === 1 ? "AND S.genderId=1 OR S.genderId=3" : genderId === 2 ? "AND S.genderId=2 OR S.genderId=3" : "";

    const currentDate = new Date();
    connection.query(`
                SELECT C.id, C.title, C.description, C.slogan, C.previewImg, C.shopId
                FROM campaigns C
                         INNER JOIN shops S ON S.id = C.shopId
                WHERE C.startDate < ?
                  AND C.endDate > ?
                ORDER BY C.createDate DESC
                LIMIT ?, ?
        `,
        [currentDate, currentDate, offset, limit],
        (err, result) => {
            if (err) {
                return res.status(200).json({
                    status: 'fail',
                    message: err,
                });
            }

            res.status(200).json(result);
        }
    );
};

exports.addCampaign = async (req, res) => {
    const {title, slogan, description, image, shopId, startDate, endDate} = req.body;

    let startD = new Date(startDate).toISOString().replace(/T/, ' ')
        .replace(/\..+/, '');
    let endD = new Date(endDate).toISOString().replace(/T/, ' ')
        .replace(/\..+/, '');


    const date = new Date();
    const formattedDate = date
        .toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '');
    const addCampaign = await jQuery(`INSERT INTO campaigns(title, description, previewimg, slogan, shopid, startdate, enddate, createDate)
                                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, image, slogan, shopId, startD, endD, formattedDate]);
    if(addCampaign.affectedRows > 0) {
        res.status(200).json({
            status: "success"
        });
    } else {
        res.status(200).json({
            status: "error",
            addCampaign
        });
    }
};

exports.editCampaign = async (req, res) => {
    const {title, slogan, description, image, shopId, startDate, endDate, campaignId} = req.body;

    let startD = new Date(startDate).toISOString().replace(/T/, ' ')
        .replace(/\..+/, '');
    let endD = new Date(endDate).toISOString().replace(/T/, ' ')
        .replace(/\..+/, '');


    const date = new Date();
    const formattedDate = date
        .toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '');
    const addCampaign = await jQuery(`UPDATE campaigns SET title = ?, description = ?, previewimg = ?, slogan = ?, startdate = ?, enddate = ?, createDate = ? WHERE shopId = ? AND id = ?`,
        [title, description, image, slogan, startD, endD, formattedDate, shopId, campaignId]);
    if(addCampaign.affectedRows > 0) {
        res.status(200).json({
            status: "success"
        });
    } else {
        res.status(200).json({
            status: "error",
            addCampaign
        });
    }
};

exports.deleteCampaign = async (req, res, next) => {
    const {campaignId, shopId} = req.body;

    const delCampaign = await jQuery(`DELETE FROM campaigns WHERE id = ? AND shopId = ?`, [campaignId, shopId]);
    if(delCampaign.affectedRows > 0 ) {
        res.status(200).json({
            status: "success"
        })
    } else {
        res.status(200).json({
            status: "error",
            message: delCampaign
        })
    }


}

