const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require("body-parser");
require('dotenv').config()
const cors = require('cors');

// Routes
const routes = require('./routes/routes');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/apiservices', routes)


mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("MongoDB Connected !"))
    .catch(err => console.log(err));

app.use(express.json());

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server started at ${process.env.PORT}`);
});