/**
 * Utility functions for data validation
 */

/**
 * Checks if a string is a valid UUID
 * @param id String to validate as UUID
 * @returns Boolean indicating if the string is a valid UUID
 */
function isValidUuid(id?: string): boolean {
  if (!id) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates if an organization ID is valid and not a placeholder
 * @param id Organization ID to validate
 * @returns Boolean indicating if the organization ID is valid
 */
export function isValidOrganizationId(id?: string): boolean {
  if (!id) return false;
  
  // Check if it's a valid UUID
  if (!isValidUuid(id)) return false;
  
  // Check if it's not a placeholder or empty UUID
  if (id === '00000000-0000-0000-0000-000000000000') return false;
  if (id.startsWith('0000')) return false;
  
  // Check if it's not a test/placeholder UUID
  if (id === '123e4567-e89b-12d3-a456-426614174000') return false;
  
  return true;
}

/**
 * Validates if a user ID is valid
 * @param id User ID to validate
 * @returns Boolean indicating if the user ID is valid
 */
function isValidUserId(id?: string): boolean {
  return isValidUuid(id);
}