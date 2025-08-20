const supabase = require('../services/supabaseClient');
const { geocodeAddress, getETAWithTraffic } = require('../services/googleService');
const { sendAlert } = require('../services/smsService');
const { scheduler } = require('../services/scheduler');

// Create a new alert
exports.createAlert = async (req, res) => {
    try {
        const { originAddress, destinationAddress, time, finalTime, autoBook, phone, username } = req.body;

        if (!originAddress || !destinationAddress || !time || !phone || !username) {
            return res.status(400).json({ error: 'Missing required fields including username' });
        }

        if (autoBook && !req.session?.uberTokens) {
            return res.status(400).json({ error: 'Auto-booking requires Uber Authentication.' });
        }

        // Check if username exists and belongs to a different phone number
        const { data: existingUsername } = await supabase
            .from('alerts')
            .select('phone')
            .eq('username', username.trim().toLowerCase())
            .limit(1);

        if (existingUsername && existingUsername.length > 0) {
            const existingPhone = existingUsername[0].phone;
            if (existingPhone !== phone.trim()) {
                return res.status(400).json({
                    error: 'This username is already taken by another user. Please choose a different username.'
                });
            }
        }

        // Check for active alert with same username/phone
        const { data: activeUserAlert } = await supabase
            .from('alerts')
            .select('id')
            .eq('username', username.trim().toLowerCase())
            .eq('phone', phone.trim())
            .eq('status', 'active')
            .limit(1);

        if (activeUserAlert && activeUserAlert.length > 0) {
            return res.status(400).json({
                error: 'You already have an active alert with this username. Please cancel it first or use a different username.'
            });
        }

        // Check for duplicate alerts in the past minute
        const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
        const { data: existingAlerts } = await supabase
            .from('alerts')
            .select('id')
            .eq('phone', phone.trim())
            .eq('origin_address', originAddress)
            .eq('destination_address', destinationAddress)
            .eq('threshold_minutes', parseInt(time))
            .eq('status', 'active')
            .gte('created_at', oneMinuteAgo)
            .limit(1);

        if (existingAlerts && existingAlerts.length > 0) {
            return res.json({
                alertId: existingAlerts[0].id,
                status: 'created',
                schedulerStarted: true,
                immediateCheckTriggered: true
            });
        }

        // Geocode addresses
        const [origin, destination] = await Promise.all([
            geocodeAddress(originAddress),
            geocodeAddress(destinationAddress)
        ]);

        // Insert the new alert
        const { data, error } = await supabase
            .from('alerts')
            .insert([{
                username: username.trim().toLowerCase(),
                origin_address: originAddress,
                destination_address: destinationAddress,
                origin_lat: origin.lat,
                origin_lng: origin.lng,
                destination_lat: destination.lat,
                destination_lng: destination.lng,
                threshold_minutes: parseInt(time),
                final_threshold: finalTime ? parseInt(finalTime) : null,
                auto_book: !!autoBook,
                phone: phone.trim(),
                user_oauth_tokens: autoBook ? req.session.olaTokens : null,
                status: 'active',
                created_at: new Date().toISOString()
            }])
            .select('id, username');

        if (error) throw error;

        // 🟢 Get current travel time right after creation
        let currentTravelTime = null;
        try {
            currentTravelTime = await getETAWithTraffic(
                { lat: origin.lat, lng: origin.lng },
                { lat: destination.lat, lng: destination.lng }
            );
        } catch (e) {
            console.log('Failed to get current travel time:', e.message);
        }

        res.json({
            alertId: data[0].id,
            username: data.username,
            status: 'created',
            schedulerStarted: true,
            immediateCheckTriggered: true
        });

        // 📱 Send SMS with current travel time (keep it short)
        const smsMessage = currentTravelTime 
            ? `Alert created! Current: ${currentTravelTime}min, Target: ${time}min. Will notify when ready.`
            : `Alert created! Monitoring for ${time}min travel time. Will notify when ready.`;
        
        sendAlert(phone, smsMessage);

        // 🟢 IMMEDIATELY process ONLY the new alert
        setImmediate(async () => {
            try {
                const { data: alert, error: fetchError } = await supabase
                    .from('alerts')
                    .select('*')
                    .eq('id', data[0].id)
                    .single();

                if (alert) {
                    console.log(`🚀 Processing new alert ${alert.id} immediately`);
                    await scheduler.processAlert(alert); // Only checks the new alert!
                } else if (fetchError) {
                    console.error('Failed to fetch alert for immediate check:', fetchError);
                }
            } catch (err) {
                console.error('Immediate alert processing failed:', err);
            }
        });

    } catch (err) {
        console.error('Error creating alert:', err);
        res.status(500).json({ error: 'Failed to create alert' });
    }
};

// Get user's ACTIVE alerts only
exports.getUserAlerts = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('id, origin_address, destination_address, threshold_minutes, created_at, auto_book, status, phone, final_threshold, last_checked, last_duration')
      .eq('username', username.trim().toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch alerts' });
    }

    const activeAlertsCount = alerts.filter(alert => alert.status === 'active').length;
    res.json({
      username: username,
      alerts: alerts || [],
      count: alerts?.length || 0,
      activeCount: activeAlertsCount,
      totalAlerts: alerts?.length || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};


// Cancel specific alert
exports.cancelAlert = async (req, res) => {
    try {
        const { username, alertId } = req.body;

        if (!username || !alertId) {
            return res.status(400).json({ error: 'Username and Alert ID are required' });
        }

        // Verify the alert belongs to this user and is active
        const { data: alertToCancel, error: fetchError } = await supabase
            .from('alerts')
            .select('id, origin_address, destination_address')
            .eq('id', alertId)
            .eq('username', username.trim().toLowerCase())
            .eq('status', 'active')
            .single();

        if (fetchError || !alertToCancel) {
            return res.status(404).json({
                error: 'Alert not found or already inactive'
            });
        }

        // Cancel the alert
        const { error: updateError } = await supabase
            .from('alerts')
            .update({
                status: 'cancelled',
                completed_at: new Date().toISOString()
            })
            .eq('id', alertId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to cancel alert' });
        }

        res.json({
            success: true,
            message: 'Alert cancelled successfully',
            cancelledAlert: {
                route: `${alertToCancel.origin_address} → ${alertToCancel.destination_address}`
            }
        });

    } catch (err) {
        console.error('Error in cancelAlert:', err);
        res.status(500).json({ error: 'Failed to cancel alert' });
    }
};

// Reactivate a cancelled/completed alert
exports.reactivateAlert = async (req, res) => {
    try {
        const { username, alertId } = req.body;
        if (!alertId || !username) {
            return res.status(400).json({ error: 'Alert ID and username are required' });
        }

        // Fetch existing alert for user
        const { data: alert, error: fetchError } = await supabase
            .from('alerts')
            .select('*')
            .eq('id', alertId)
            .eq('username', username.trim().toLowerCase())
            .single();

        if (fetchError || !alert) {
            return res.status(404).json({ error: 'Alert not found.' });
        }
        if (alert.status === 'active') {
            return res.status(400).json({ error: 'Alert is already active.' });
        }

        // Reactivate alert
        const { error: updateError } = await supabase
            .from('alerts')
            .update({
                status: 'active',
                created_at: new Date().toISOString(),
                completed_at: null,
                last_checked: null,
                last_duration: null,
                completion_reason: null
            })
            .eq('id', alertId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to reactivate alert.' });
        }

        // Get latest travel time
        let currentTravelTime = null;
        try {
            currentTravelTime = await getETAWithTraffic(
                { lat: alert.origin_lat, lng: alert.origin_lng },
                { lat: alert.destination_lat, lng: alert.destination_lng }
            );
        } catch (e) {
            console.log('Failed to get current travel time:', e.message);
        }

        // Send SMS message on reactivation
        const smsMessage = currentTravelTime 
            ? `Alert reactivated! Current: ${currentTravelTime}min, Target: ${alert.threshold_minutes}min. Will notify when ready.`
            : `Alert reactivated! Monitoring for ${alert.threshold_minutes}min travel time. Will notify when ready.`;

        sendAlert(alert.phone, smsMessage);

        res.json({ success: true, message: 'Alert reactivated successfully.' });

        setImmediate(async () => {
            try {
                console.log(`🚀 Processing reactivated alert ${alert.id} immediately`);
                await scheduler.processAlert(alert);
            } catch (err) {
                console.error('Immediate alert processing failed:', err);
            }
        });


    } catch (err) {
        console.error('Error in reactivateAlert:', err);
        res.status(500).json({ error: 'Failed to reactivate alert.' });
    }
};