/**
 * Task mapping utilities for converting between UI and database formats
 * Provides robust data validation and normalization
 */

/**
 * Normalizes dates to YYYY-MM-DD format for database storage
 * Handles various input types gracefully
 * Uses local dates to prevent timezone shift issues
 */
export function normaliseDateToYMD(d?: string | Date | null): string | null {
  if (!d) return null;
  
  try {
    const dt = (d instanceof Date) ? d : new Date(d);
    
    // Check if date is valid
    if (isNaN(dt.getTime())) {
      console.warn('⚠️ Invalid date provided:', d);
      return null;
    }
    
    // Use local date methods to prevent timezone shift
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    
    // Return YYYY-MM-DD format using local date
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('⚠️ Error processing date:', d, error);
    return null;
  }
}

/**
 * Maps UI status values to database enum values
 * Handles case variations and provides fallbacks
 * Only supports statuses that exist in the database enum
 */
export function mapStatusToDb(ui?: string): string {
  if (!ui) return 'Todo';
  
  const s = ui.toLowerCase().replace(/\s+/g, '_');
  const titleMap: Record<string, string> = {
    "todo": "Todo",
    "in_progress": "In Progress",
    "inprogress": "In Progress",
    "in progress": "In Progress",
    "completed": "Completed"
    // Removed unsupported statuses: on_hold, cancelled, etc.
  };
  
  const mappedStatus = titleMap[s] ?? "Todo";
  console.log(`🔄 Status mapping: "${ui}" → "${mappedStatus}"`);
  return mappedStatus;
}

/**
 * Maps UI priority values to database enum values
 * Handles case variations and provides fallbacks
 */
export function mapPriorityToDb(ui?: string): string {
  if (!ui) return 'Medium';
  
  const p = ui.toLowerCase();
  const titleMap: Record<string, string> = {
    "low": "Low",
    "medium": "Medium",
    "high": "High",
    "critical": "Critical"
  };
  
  const mappedPriority = titleMap[p] ?? "Medium";
  console.log(`🔄 Priority mapping: "${ui}" → "${mappedPriority}"`);
  return mappedPriority;
}

/**
 * Safely trims string values, handling undefined/null
 */
export function safeTrim(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Filters out undefined values from an object
 * Useful for preventing database schema errors
 */
export function filterUndefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const filtered: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      filtered[key as keyof T] = value;
    }
  }
  
  return filtered;
}

/**
 * Validates required fields for task creation
 * Returns array of missing field names
 */
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]): string[] {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * Maps UI task data to database format
 * Applies all necessary transformations and validations
 */
export function mapUITaskToDatabase(uiTask: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  startDate?: string | Date | null;
  dueDate?: string | Date | null;
  assignees?: string[];
  department?: string;
  created_by: string;
  documentLinks?: string[]; // Add document links support
}): Record<string, any> {
  // Build the payload with transformations
  const payload = {
    title: safeTrim(uiTask.title),
    description: safeTrim(uiTask.description),
    status: mapStatusToDb(uiTask.status),
    priority: mapPriorityToDb(uiTask.priority),
    start_date: normaliseDateToYMD(uiTask.startDate),
    due_date: normaliseDateToYMD(uiTask.dueDate),
    created_by: uiTask.created_by,
    department: safeTrim(uiTask.department) ?? 'Production', // Default to Production
    document_links: uiTask.documentLinks || [], // Map document links to database field
  };
  
  // Filter out undefined values and return
  return filterUndefinedValues(payload);
} 