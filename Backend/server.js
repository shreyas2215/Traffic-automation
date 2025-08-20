require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../FrontEnd/build')));
} else {
 
  console.log('Development mode: React dev server should handle frontend');
}


// Security headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://login.uber.com https://*.uber.com",
    "connect-src 'self' https://maps.googleapis.com https://maps.gstatic.com https://login.uber.com https://*.uber.com https://api.uber.com",
    "frame-src 'self' https://login.uber.com https://*.uber.com",
    "img-src 'self' data: https://maps.gstatic.com https://maps.googleapis.com https://*.uber.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com"
  ].join('; '));
  next();
});

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  })
);


app.use('/api/alerts', require('./routes/alerts'));
app.use('/auth', require('./routes/auth'));



app.get('/manage-alerts', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/manage-alerts.html'));
});


require('./services/scheduler');


app.listen(PORT, () => {
  console.log(`🚀 Traffic Alert Server running on port ${PORT}`);
});
