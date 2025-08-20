// services/olaService.js
const fetch = require('node-fetch');

const OLA_BASE_URL = 'https://devapi.olacabs.com'; // Use production URL when live
const OLA_APP_TOKEN = process.env.OLA_APP_TOKEN; // Your Ola X-APP-TOKEN

//  Get ride estimate and fare_id
exports.getRideEstimate = async (userTokens, origin, destination, category = 'mini') => {
  const url = `${OLA_BASE_URL}/v1/products`;
  
  const params = new URLSearchParams({
    pickup_lat: origin.lat,
    pickup_lng: origin.lng,
    drop_lat: destination.lat,
    drop_lng: destination.lng,
    category: category,
    pickup_mode: 'now'
  });

  const response = await fetch(`${url}?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userTokens.access_token}`,
      'X-APP-TOKEN': OLA_APP_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  
  if (data.status !== 'SUCCESS') {
    throw new Error(data.message || 'Failed to get ride estimate');
  }

  // Find the requested category in response
  const categoryData = data.categories.find(cat => cat.category === category);
  
  return {
    fare_id: categoryData?.ride_estimate?.fare_id,
    estimated_cost: categoryData?.ride_estimate?.amount_max,
    estimated_duration: categoryData?.eta,
    category: category,
    available: categoryData?.eta !== -1
  };
};

//  Book the actual ride using fare_id
exports.createRide = async (userTokens, origin, destination, category = 'mini', fareId = null) => {
  const url = `${OLA_BASE_URL}/v1.5/bookings/create`;
  
  const bookingData = {
    pickup_lat: origin.lat,
    pickup_lng: origin.lng,
    drop_lat: destination.lat,
    drop_lng: destination.lng,
    category: category,
    pickup_mode: 'now',
    payment_instrument_type: 'cash' // or 'ola_money'
  };

  // Add fare_id if provided for upfront pricing
  if (fareId) {
    bookingData.fare_id = fareId;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userTokens.access_token}`,
      'X-APP-TOKEN': OLA_APP_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  });

  const data = await response.json();
  
  if (data.status === 'SUCCESS') {
    return { 
      success: true, 
      booking_id: data.booking_id,
      message: data.message,
      timeout: data.booking_timeout
    };
  } else {
    throw new Error(data.message || 'Booking failed');
  }
};

// Track ride status
exports.trackRide = async (userTokens, bookingId) => {
  const url = `${OLA_BASE_URL}/v1/bookings/track_ride`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userTokens.access_token}`,
      'X-APP-TOKEN': OLA_APP_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      booking_id: bookingId
    })
  });

  const data = await response.json();
  return data;
};

//  Cancel/Abort booking
exports.cancelRide = async (userTokens, bookingId) => {
  const url = `${OLA_BASE_URL}/v1/bookings/abort`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userTokens.access_token}`,
      'X-APP-TOKEN': OLA_APP_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      booking_id: bookingId
    })
  });

  const data = await response.json();
  return data;
};


exports.bookOlaRide = async (userTokens, origin, destination, category = 'mini') => {
  try {
    // Step 1: Get estimate (optional for fare_id)
    let fareId = null;
    try {
      const estimate = await exports.getRideEstimate(userTokens, origin, destination, category);
      fareId = estimate.fare_id;
      
      if (!estimate.available) {
        throw new Error(`${category} category not available at this location`);
      }
    } catch (estimateError) {
      console.log('Estimate failed, proceeding without fare_id:', estimateError.message);
    }
    
    // Step 2: Book ride
    const booking = await exports.createRide(userTokens, origin, destination, category, fareId);
    
    // Step 3: Start polling for driver allocation
    const rideDetails = await exports.pollForDriver(userTokens, booking.booking_id);
    
    return {
      booking_id: booking.booking_id,
      status: rideDetails.booking_status,
      driver_details: rideDetails.driver_name ? {
        name: rideDetails.driver_name,
        phone: rideDetails.driver_number,
        vehicle: rideDetails.cab_details,
        rating: rideDetails.driver_rating
      } : null,
      otp: rideDetails.otp?.start_trip?.value
    };
  } catch (error) {
    console.error('Ola booking error:', error);
    throw error;
  }
};


exports.pollForDriver = async (userTokens, bookingId, maxAttempts = 30) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await exports.trackRide(userTokens, bookingId);
    
    if (status.booking_status === 'CALL_DRIVER') {
      // Driver allocated successfully
      return status;
    } else if (status.booking_status === 'ALLOTMENT_FAILED') {
      throw new Error('No drivers available');
    } else if (status.booking_status === 'BOOKING_CANCELLED') {
      throw new Error('Booking was cancelled');
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Booking timeout - no driver allocated');
};

// Get available ride categories
exports.getAvailableProducts = async (userTokens, location) => {
  const url = `${OLA_BASE_URL}/v1/products`;
  
  const params = new URLSearchParams({
    pickup_lat: location.lat,
    pickup_lng: location.lng,
    pickup_mode: 'now'
  });

  const response = await fetch(`${url}?${params}`, {
    headers: {
      'Authorization': `Bearer ${userTokens.access_token}`,
      'X-APP-TOKEN': OLA_APP_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  return data.categories || [];
};
