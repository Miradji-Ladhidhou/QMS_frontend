export function isMaintenanceResponse(response) {
  return response?.status === 503 && response.data?.code === 'PLATFORM_MAINTENANCE';
}
