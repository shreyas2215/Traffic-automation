const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { getETAWithTraffic } = require('./googleService');
const { sendAlert } = require('./smsService');
const { bookOlaRide } = require('./olaService');

class TrafficScheduler {
    constructor() {
        this.activeJobs = new Map();
        this.startMainScheduler();
    }

    async startMainScheduler() {
        await this.checkAllActiveAlerts();
        const job = cron.schedule('*/10 * * * *', async () => {
            await this.checkAllActiveAlerts();
        });
        this.activeJobs.set('main', job);
    }

    async checkAllActiveAlerts() {
        try {
            const { data: alerts, error } = await supabase
                .from('alerts')
                .select('*')
                .eq('status', 'active');

            if (error || !alerts || alerts.length === 0) {
                return;
            }

            for (const alert of alerts) {
                await this.processAlert(alert);
            }

        } catch (error) {
            console.error('Error in checkAllActiveAlerts:', error);
        }
    }

    async processAlert(alert) {
        try {
            const { data: freshAlert, error } = await supabase
                .from('alerts')
                .select('*')
                .eq('id', alert.id)
                .single();
            
            if (error || !freshAlert) {
                return;
            }
            
            alert = freshAlert;
            
            const now = new Date();
            const created = new Date(alert.created_at);
            const minsSinceCreated = (now - created) / (1000 * 60);
            const finalThresholdMins = alert.final_threshold;

            if (typeof finalThresholdMins === 'number' && minsSinceCreated >= finalThresholdMins) {
                const message = `Time expired: ${finalThresholdMins} min have passed. Monitoring stopped.${alert.auto_book ? ' Auto-booking your cab now.' : ''}`;
                await sendAlert(alert.phone, message);

                if (alert.auto_book && alert.user_oauth_tokens) {
                    await this.attemptAutoBooking(alert);
                }
                await this.deactivateAlert(alert.id, 'final_time_reached');
                return;
            }
            
            const currentDuration = await getETAWithTraffic(
                { lat: alert.origin_lat, lng: alert.origin_lng },
                { lat: alert.destination_lat, lng: alert.destination_lng }
            );

            const threshold = alert.threshold_minutes;

            
            if (currentDuration < threshold) {
                console.log(`Alert ${alert.id}: ${currentDuration} < ${threshold} (THRESHOLD MET)`);
            } else {
                console.log(`Alert ${alert.id}: ${currentDuration} > ${threshold} (STILL WAITING)`);
            }

            if (currentDuration <= threshold) {
                await this.sendTrafficAlert(alert, currentDuration);

                if (alert.auto_book && alert.user_oauth_tokens) {
                    await this.attemptAutoBooking(alert);
                }

                await this.deactivateAlert(alert.id, 'threshold_met');

            } else if (
                typeof alert.last_duration === 'number' && 
                currentDuration < alert.last_duration && 
                currentDuration > threshold
            ) {
                const improvementMessage = `Good news! Travel time improved from ${alert.last_duration} to ${currentDuration} minutes (target: ${threshold} min). Getting better!`;
                await sendAlert(alert.phone, improvementMessage);
                await this.logNotification(alert.id, 'traffic_improvement', `Improved from ${alert.last_duration} to ${currentDuration} min`);
                await this.updateLastCheck(alert.id, currentDuration);

            } else {
                await this.updateLastCheck(alert.id, currentDuration);
            }

        } catch (error) {
            console.error(`Error processing alert ${alert.id}:`, error);
        }
    }

    async deactivateAlert(alertId, reason = 'completed') {
        try {
            const { error } = await supabase
                .from('alerts')
                .update({ 
                    status: 'completed',
                    completion_reason: reason,
                    completed_at: new Date().toISOString()
                })
                .eq('id', alertId);

            if (error) throw error;

        } catch (error) {
            console.error(`Failed to deactivate alert ${alertId}:`, error);
        }
    }

    async sendTrafficAlert(alert, currentDuration) {
        try {
            const message = `TRAFFIC ALERT: Your route is now ${currentDuration} minutes (threshold: ${alert.threshold_minutes} min). Time to go!`;
            await sendAlert(alert.phone, message);
            await this.logNotification(alert.id, 'threshold_met', message);

        } catch (error) {
            await this.logNotification(alert.id, 'sms_failed', error.message);
        }
    }

    async attemptAutoBooking(alert) {
        try {
            const pickup = { lat: alert.origin_lat, lng: alert.origin_lng };
            const destination = { lat: alert.destination_lat, lng: alert.destination_lng };
            
            const booking = await bookOlaRide(alert.user_oauth_tokens, pickup, destination, 'mini');
            
            const successMessage = `SUCCESS: Your Ola has been booked! Booking ID: ${booking.booking_id}. Status: ${booking.status}.`;
            
            await sendAlert(alert.phone, successMessage);
            await this.logNotification(alert.id, 'auto_book_success', JSON.stringify(booking));
            
        } catch (error) {
            let errorMessage = 'Could not book your Ola ride automatically.';
            
            if (error.message.includes('No drivers available')) {
                errorMessage = 'No Ola drivers available in your area right now.';
            } else if (error.message.includes('category not available')) {
                errorMessage = 'Selected ride category not available. Try booking manually.';
            }
            
            const failMessage = `AUTO-BOOK FAILED: ${errorMessage} Please book manually in the Ola app.`;
            await sendAlert(alert.phone, failMessage);
            await this.logNotification(alert.id, 'auto_book_failed', error.message);
        }
    }

    async updateLastCheck(alertId, currentDuration) {
        try {
            const { error } = await supabase
                .from('alerts')
                .update({ 
                    last_checked: new Date().toISOString(),
                    last_duration: currentDuration
                })
                .eq('id', alertId);

            if (error) throw error;

        } catch (error) {
            console.error(`Failed to update last check for alert ${alertId}:`, error);
        }
    }

    async logNotification(alertId, type, message) {
        try {
            const { error } = await supabase
                .from('alert_logs')
                .insert([{
                    alert_id: alertId,
                    type: type,
                    message: message,
                    created_at: new Date().toISOString()
                }]);

            if (error && !error.message.includes('does not exist')) {
                console.error('Failed to log notification:', error);
            }

        } catch (error) {
            
        }
    }

    async triggerManualCheck() {
        await this.checkAllActiveAlerts();
    }

    getStatus() {
        return {
            active: true,
            activeJobs: this.activeJobs.size,
            lastRun: new Date().toISOString(),
            nextRun: 'Every 10 minutes'
        };
    }

    stop() {
        this.activeJobs.forEach(job => job.stop());
        this.activeJobs.clear();
    }

    async getStats() {
        try {
            const { data: activeAlerts } = await supabase
                .from('alerts')
                .select('*')
                .eq('status', 'active');

            const { data: completedAlerts } = await supabase
                .from('alerts')
                .select('*')
                .eq('status', 'completed');

            return {
                activeAlerts: activeAlerts?.length || 0,
                completedAlerts: completedAlerts?.length || 0,
                totalAlerts: (activeAlerts?.length || 0) + (completedAlerts?.length || 0)
            };

        } catch (error) {
            return { activeAlerts: 0, completedAlerts: 0, totalAlerts: 0 };
        }
    }
}

const scheduler = new TrafficScheduler();

module.exports = {
    scheduler,
    triggerManualCheck: () => scheduler.triggerManualCheck(),
    getStatus: () => scheduler.getStatus(),
    getStats: () => scheduler.getStats(),
    stop: () => scheduler.stop()
};
