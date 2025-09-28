const axios = require('axios');

exports.geocodeAddress = async (address) => {
  console.log('=== GEOCODING DEBUG ===');
  console.log('Input address:', address);
  console.log('API key exists:', !!process.env.GOOGLE_MAPS_API_KEY);
  console.log('API key first 10 chars:', process.env.GOOGLE_MAPS_API_KEY?.substring(0, 10));
  
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  
  console.log('Geocoding URL:', url);
  
  try {
    const response = await axios.get(url);
    const data = response.data;
    
    console.log('Google response status:', data.status);
    console.log('Results count:', data.results?.length || 0);
    
    if (data.status !== 'OK') {
      console.error('Google API error:', data.error_message || data.status);
    }
    
    if (!data.results?.length) {
      console.error('No results for address:', address);
      throw new Error('Invalid address');
    }
    
    console.log('Geocoding successful:', data.results[0].geometry.location);
    return data.results[0].geometry.location;
    
  } catch (error) {
    console.error('Geocoding axios error:', error.message);
    throw error;
  }
};






exports.getETAWithTraffic = async (origin, destination) => {
    console.log('=== ETA WITH TRAFFIC DEBUG ===');
    console.log('📍 Origin:', origin);
    console.log('📍 Destination:', destination);
    console.log('🔑 API Key exists:', !!process.env.GOOGLE_MAPS_API_KEY);

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&departure_time=now&traffic_model=best_guess&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    console.log('🌐 Request URL:', url);

    try {
        console.log('📡 Making API request...');
        const res = await axios.get(url);
        
        const data = res.data;
        console.log('📋 Full API Response:', JSON.stringify(data, null, 2));
        
        if (data.status !== 'OK') {
            throw new Error(`Distance Matrix API error: ${data.error_message || data.status}`);
        }
        
        if (!data.rows || !data.rows[0] || !data.rows[0].elements || !data.rows[0].elements[0]) {
            throw new Error('Invalid response structure from Distance Matrix API');
        }
        
        const element = data.rows[0].elements[0];
        console.log('🎯 Route Element:', JSON.stringify(element, null, 2));
        
        if (element.status !== 'OK') {
            throw new Error(`Route calculation failed: ${element.status}`);
        }
        
        const trafficDuration = element.duration_in_traffic?.value;
        const regularDuration = element.duration?.value;
        const distance = element.distance?.value;
        
        console.log('⏱️ Traffic duration (seconds):', trafficDuration);
        console.log('⏱️ Regular duration (seconds):', regularDuration);
        console.log('📏 Distance (meters):', distance);
        
        const seconds = trafficDuration || regularDuration;
        
        if (seconds === undefined) {
            throw new Error('Duration data not available');
        }
        
        const minutes = Math.ceil(seconds / 60);
        const distanceKm = distance ? (distance / 1000).toFixed(1) : 'N/A';
        
        console.log('✅ Final Results:');
        console.log(`- Duration: ${minutes} minutes (${seconds} seconds)`);
        console.log(`- Distance: ${distanceKm} km`);
        console.log(`- Using traffic data: ${!!trafficDuration}`);
        console.log('================================');
        
        // ✅ Return just the number of minutes
        return minutes;
        
    } catch (error) {
        console.error('❌ ETA calculation error:', error.message);
        throw error;
    }
};





