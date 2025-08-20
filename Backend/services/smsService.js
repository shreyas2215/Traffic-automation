const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendAlert = async (phoneNumber, message) => {
  console.log('=== SENDING SMS VIA TWILIO ===');
  console.log('To:', phoneNumber);
  console.log('From:', process.env.TWILIO_PHONE_NUMBER);
  console.log('Message:', message);
  
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
      to: phoneNumber
    });
    
    console.log('✅ SMS sent successfully via Twilio');
    console.log('Message SID:', result.sid);
    console.log('Status:', result.status);
    
    return { 
      success: true, 
      provider: 'Twilio',
      messageSid: result.sid,
      status: result.status
    };
    
  } catch (error) {
    console.error('❌ Twilio SMS failed:', error.message);
    throw error;
  }
};
