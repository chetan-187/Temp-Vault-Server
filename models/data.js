const mongoose = require('mongoose');

const data = new mongoose.Schema(
    {
        uuid: {
            type: String,
            unique: true,
            required: '{PATH} is required!'
        },
        cipherText: {
            type: String,
            required: '{PATH} is required!'
        },
        expirationTime: {
            type: Number,
            required: '{PATH} is required!'
        },
        viewOnce: {
            type: Boolean,
            required: '{PATH} is required!'
        },
        dataViewed: {
            type: Boolean
        }
    },
    {
        timestamps: true
    });

module.exports = mongoose.model('data', data);