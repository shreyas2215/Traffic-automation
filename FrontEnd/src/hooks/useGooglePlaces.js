// FrontEnd/src/hooks/useGooglePlaces.js
import { useEffect } from 'react';

export const useGooglePlaces = (inputIds = []) => {
  useEffect(() => {
    const initializeAutocomplete = () => {
      inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input && window.google && window.google.maps && window.google.maps.places) {
          const autocomplete = new window.google.maps.places.Autocomplete(input, {
            componentRestrictions: { country: 'IN' },
            fields: ['formatted_address', 'geometry', 'name'],
            types: ['establishment', 'geocode']
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.formatted_address) {
              const event = new Event('input', { bubbles: true });
              input.dispatchEvent(event);
            }
          });
        }
      });
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initializeAutocomplete();
    } else {
      // Set up the callback for when Google Maps loads
      window.initializeGooglePlaces = initializeAutocomplete;
    }

    // Cleanup
    return () => {
      if (window.initializeGooglePlaces) {
        delete window.initializeGooglePlaces;
      }
    };
  }, [inputIds]);
};
