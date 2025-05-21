export function formatDate(isoString: string | undefined | null): string {
  if (!isoString) return "N/A";
  
  try {
    // Check if it's an empty string
    if (isoString.trim() === '') return "N/A";
    
    // Try multiple date parsing approaches
    let date: Date | null = null;
    
    // Approach 1: Try direct parsing
    date = new Date(isoString);
    
    // Approach 2: If that fails, try handling YYYY-MM-DD format
    if (isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
      const parts = isoString.split('-');
      // Note: month is 0-indexed in JavaScript Date
      date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    
    // Approach 3: If that fails, try parsing DD/MM/YYYY format
    if (isNaN(date.getTime()) && /^\d{2}\/\d{2}\/\d{4}$/.test(isoString)) {
      const parts = isoString.split('/');
      date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    
    // Check if any parsing approach succeeded
    if (date === null || isNaN(date.getTime())) {
      console.warn(`Could not parse date: ${isoString}`);
      return "N/A";
    }
    
    // Format the date using toLocaleDateString
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
  } catch (e) {
    console.error(`Error formatting date: ${isoString}`, e);
    return "N/A";
  }
} 