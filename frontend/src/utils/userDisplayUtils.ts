/**
 * Utilities for user display formatting
 */

interface UserWithName {
  full_name?: string;
  email: string;
}

/**
 * Gets a display name from user data
 * @param user User object with full_name and email
 * @returns Formatted display name
 */
export function getDisplayName(user: UserWithName): string {
  // If full_name exists, use it
  if (user.full_name && user.full_name.trim()) {
    return user.full_name;
  }
  
  // If email exists, use the part before the @ symbol
  if (user.email) {
    const emailUsername = user.email.split('@')[0];
    // Capitalize first letter and replace dots/underscores with spaces
    return emailUsername
      .split(/[._]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  
  // Fallback
  return 'Anonymous User';
}

/**
 * Gets avatar initials from user data
 * @param user User object with full_name and email
 * @returns 1-2 character initials for avatar
 */
export function getAvatarInitials(user: UserWithName): string {
  // If full_name exists, use first 2 chars
  if (user.full_name && user.full_name.trim()) {
    return user.full_name.substring(0, 2).toUpperCase();
  }
  
  // If email exists, use first 2 chars from username part
  if (user.email) {
    const emailUsername = user.email.split('@')[0];
    return emailUsername.substring(0, 2).toUpperCase();
  }
  
  // Fallback
  return 'U';
}

/**
 * Formats a plan name for display
 * @param plan Plan code or name
 * @returns Formatted plan name
 */
export function formatPlanName(plan: string | undefined): string {
  if (!plan) return 'Free';
  
  // If it already has "Plan" in it, return as is
  if (plan.toLowerCase().includes('plan')) {
    // Ensure first letter is capitalized
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
  
  // Handle common plan codes
  const planMap: Record<string, string> = {
    'free': 'Free Plan',
    'pro': 'Pro Plan',
    'premium': 'Premium Plan',
    'organizer': 'Organizer Plan',
    'business': 'Business Plan',
    'enterprise': 'Enterprise Plan'
  };
  
  // Check if plan code exists in our map (case insensitive)
  const planLower = plan.toLowerCase();
  if (planLower in planMap) {
    return planMap[planLower];
  }
  
  // Default: capitalize first letter and add " Plan"
  return plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
} 