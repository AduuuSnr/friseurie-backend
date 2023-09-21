const mysql = require('mysql');
require('dotenv').config({ path: './.env' });
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require("fs");
const cors = require("cors");
const connection = require('./db/db');
process.env.TZ = 'Europe/Istanbul';

const app = express();


//CORS POLICY
const corsConfig = {
  credentials: true,
  origin: '*',
};
app.use(cors(corsConfig));

//Routes
const userRouter = require('./routes/userRouter');
const ownerRouter = require('./routes/ownerRouter');
const loginRouter = require('./routes/loginRouter');
const secretRouter = require('./routes/secretRouter');
const appointmentRouter = require('./routes/appointmentRouter');
const campaignsRouter = require('./routes/campaignsRouter');
const shopsRouter = require('./routes/shopRouter');



// MIDDLEWARES
app.use(express.json());
app.use('/users', userRouter);
app.use('/owners', ownerRouter);
app.use('/login', loginRouter);
app.use('/secret', secretRouter);
app.use('/appointments', appointmentRouter);
app.use('/campaigns', campaignsRouter);
app.use('/shops', shopsRouter);



// ENV FILES
const PORT = process.env.PORT;

app.get('/', (req, res, next) => {
  res.json({ status: 'success', message: 'Barber App Backend' });
});


//SSL Stuff
//app.use(express.static(__dirname, { dotfiles: 'allow' } ));

const privateKey = fs.readFileSync('/etc/letsencrypt/live/api.friseurie.app/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/api.friseurie.app/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/api.friseurie.app/fullchain.pem', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca
};
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(80, () => {
  console.log('HTTP Server running on port 80');
});

httpsServer.listen(443, () => {

  console.log('HTTPS Server running on port 443');
});








