const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const crypto = require("crypto");
require('dotenv').config();
const redis = require("ioredis");

const client = redis.createClient({
    host: process.env.REDIS_HOSTNAME,
    port: process.env.REDIS_PORT,
    username: '',
    password: process.env.REDIS_PASSWORD
});

client.on("connect", () => {
    console.log("Connected to redis instance !");
});

const Data = require('../models/data.js');

const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.KEY);
const iv = crypto.randomBytes(16);

router.post('/insert', (req, res) => {
    console.log('Data received Succesfully -> ', req.body);
    const [CipherText, IV] = encryptData(req.body.cipherText);
    const newData = new Data({
        uuid: req.body.uuid,
        cipherText: CipherText,
        expirationTime: req.body.expirationTime,
        viewOnce: req.body.viewOnce,
        dataViewed: false,
        initializationVector: IV
    });

    newData.save()
        .then(data => {
            res.json({ success: true });
            incrementPostRequestCount();
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
        return res.json(response);
    } catch (error) {
        return res.status(500).json(error);
    }
})

router.get('/get-count', async (req, res) => {
    const uuid = req.params.uuid;
    try {
        client.get('postRequestCount', function (err, result) {
            const count = parseInt(result);
            return res.json({ count: count })
        });
    } catch (error) {
        return res.status(500).json(error);
    }
})

router.get('/delete/:uuid', function (req, res) {
    try {
        Data.findOneAndDelete({ uuid: req.params.uuid })
            .then(data => {
                res.json({ data })
            })
            .catch(error => {
                res.status(500).json(error)
            })
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

    const decryptedData = decryptData(data.cipherText, data.initializationVector);
    const responseToSend = { data: decryptedData, viewOnce: data.viewOnce, expirationTime: data.expirationTime };
    console.log("Sending data while link is not expired ", responseToSend);
    return responseToSend;
}

const encryptData = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const data = encrypted.toString('hex');
    return [data, iv ];
}

const decryptData = (text, iv) => {
    const encryptedText = Buffer.from(text, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted;
    try {
        decrypted = decipher.update(encryptedText);
    } catch (err) {
        console.error('Error during decryption:', err);
        return null;
    }
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const incrementPostRequestCount = () => {
    client.incr('postRequestCount', (err, count) => {
        if (err) {
            console.error(err);
            throw err;
            return;
        }
        console.log(`Total post requests: ${count}`);
        return;
    });
}

module.exports = router;