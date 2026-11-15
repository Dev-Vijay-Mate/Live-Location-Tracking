import React from 'react';
import BuildingCanvas from '../components/building3d/BuildingCanvas';

/**
 * Backwards-compatibility wrapper for Member 3 integration.
 * Delegates directly to the modular BuildingCanvas component.
 */
export default function Building({
  activeFloor = 'ALL',
  selectedFloor,
  devices = [],
  selectedDeviceId = null,
  onSelectDevice = null,
  ...rest
}) {
  const floor = selectedFloor || activeFloor || 'ALL';

  return (
    <BuildingCanvas
      selectedFloor={floor}
      devices={devices}
      selectedDeviceId={selectedDeviceId}
      onSelectDevice={onSelectDevice}
      {...rest}
    />
  );
}
