export function generateSKU(categoryName: string, type: string, productName: string, counter: number = 1): string {
  // Extract a 3-letter prefix for type (e.g. HARDWARE -> HRD)
  const typePrefix = type.substring(0, 3).toUpperCase();
  
  // Create an abbreviation of the product name (e.g., "Laptop Pro" -> LAP)
  const nameParts = productName.toUpperCase().split(' ').map(p => p.replace(/[^A-Z]/g, ''));
  const nameAbbr = nameParts.length >= 2 
    ? nameParts[0].substring(0, 3) + '-' + nameParts[1].substring(0, 3)
    : nameParts[0].substring(0, 4);

  // Counter with leading zeros
  const seq = String(counter).padStart(3, '0');

  return `${typePrefix}-${nameAbbr}-${seq}`;
}
