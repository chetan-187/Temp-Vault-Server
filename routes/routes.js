const express = require('express');
const router = express.Router();
const cron = require('node-cron');

const Data = require('../models/data.js');

router.post('/insert', (req, res) => {
    console.log('Data received Succesfully -> ', req.body);
    const newData = new Data({
        uuid: req.body.uuid,
        cipherText: req.body.cipherText,
        expirationTime: req.body.expirationTime,
        viewOnce: req.body.viewOnce,
        dataViewed: false
    });

    newData.save()
        .then(data => {
            res.json({ success: true });
        })
        .catch((error) => {
            res.status(500).json(error);
        });
})

router.get('/get/:uuid', async (req, res) => {
    const uuid = req.params.uuid;
    try {
        const data = await Data.findOne({ uuid });
        const response = await createResponse(data, uuid);
        res.json(response); s
    } catch (error) {
        res.status(500).json(error);
    }
})

router.get('/delete/:uuid', function (req, res) {
    try {
        Data.findOneAndDelete(req.params.uuid)
            .then(data => res.json({ success: true }))
            .catch(error => res.status(500).json(error))
    }
    catch (error) {
        res.status(500).json(error);
    }
})

cron.schedule('00 00 * * *', async () => {
    console.log('------------Executing cron job to delete expired documents----------');
    try {
        const now = Date.now();
        const dataToDelete = await Data.find({ expirationTime: { $lte: now } }).exec();
        console.log(dataToDelete);
        await dataToDelete.map(i => i.deleteOne());
    }
    catch (error) {
        res.status(500).json(error);
    }
    console.log(`---------------------Deleted ${dataToDelete.length} expired documents-----------------------`);
});



const updateViewedStatus = async (uuid) => {
    await Data.updateOne({ uuid }, { dataViewed: true });
}

const createResponse = async (data, uuid) => {
    const response = {
        expired: true,
    };
    if (data && data.dataViewed && data.viewOnce) {
        return response;
    }
    else if (data && Date.now() > data.expirationTime) {
        return response;
    }

    if (data.dataViewed === false)
        await updateViewedStatus(uuid);

    console.log("Sending data while link is not expired ", data);
    return data;
}

module.exports = router;