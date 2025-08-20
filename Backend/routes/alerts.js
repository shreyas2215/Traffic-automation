const express = require('express');
const router = express.Router();


const { createAlert, getUserAlerts, cancelAlert, reactivateAlert } = require('../controllers/alertsController');

router.post('/', createAlert);
router.get('/user/:username/allalerts', getUserAlerts);
router.post('/cancel', cancelAlert);
router.post('/reactivate', reactivateAlert);

module.exports = router;
