// components/labor/LocationSelector.tsx
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import api from '@/lib/axios'; // Import axios instance

interface Location {
  location_id: number;
  location_name: string;
  location_code: string;
  sevenshift_location_id?: string;
}

interface LocationSelectorProps {
  selectedLocationId?: number;
  onLocationChange: (locationId: number, sevenshiftLocationId?: string) => void;
  onLocationChangeWithName?: (locationId: number, sevenshiftLocationId?: string, locationName?: string) => void;
  defaultLocationId?: number;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocationId,
  onLocationChange,
  onLocationChangeWithName,
  defaultLocationId
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/employees/locations');
        setLocations(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch locations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Set default location when locations are loaded
  useEffect(() => {
    if (locations.length > 0 && defaultLocationId) {
      // If no location is selected or if the selected location is not in the loaded locations
      const currentLocation = locations.find(loc => loc.location_id === selectedLocationId);
      if (!currentLocation) {
        const defaultLocation = locations.find(loc => loc.location_id === defaultLocationId);
        if (defaultLocation) {
          const sevenshiftId = defaultLocation.sevenshift_location_id && defaultLocation.sevenshift_location_id.trim() !== '' 
            ? defaultLocation.sevenshift_location_id 
            : undefined;
          onLocationChange(defaultLocation.location_id, sevenshiftId);
        } else {
          // If default location not found, use the first available location
          const firstLocation = locations[0];
          const sevenshiftId = firstLocation.sevenshift_location_id && firstLocation.sevenshift_location_id.trim() !== '' 
            ? firstLocation.sevenshift_location_id 
            : undefined;
          onLocationChange(firstLocation.location_id, sevenshiftId);
        }
      }
    }
  }, [locations, selectedLocationId, defaultLocationId, onLocationChange]);

  const selectedLocation = locations.find(loc => loc.location_id === selectedLocationId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
        <Building2 className="w-4 h-4 text-gray-400 animate-pulse" />
        <span className="text-sm text-gray-500">Loading locations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
        <Building2 className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-600">Error loading locations</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={selectedLocationId?.toString()} 
        onValueChange={(value) => {
          const location = locations.find(loc => loc.location_id === parseInt(value));
          const sevenshiftId = location?.sevenshift_location_id && location.sevenshift_location_id.trim() !== '' 
            ? location.sevenshift_location_id 
            : undefined;
          onLocationChange(parseInt(value), sevenshiftId);
          if (onLocationChangeWithName) {
            onLocationChangeWithName(parseInt(value), sevenshiftId, location?.location_name);
          }
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select location">
            {selectedLocation && (
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedLocation.location_name}</span>
                <span className="text-xs text-gray-500">({selectedLocation.location_code})</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className="w-48">
          {locations.map((location) => (
            <SelectItem key={location.location_id} value={location.location_id.toString()}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{location.location_name}</span>
                <span className="text-xs text-gray-500">({location.location_code})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}; 