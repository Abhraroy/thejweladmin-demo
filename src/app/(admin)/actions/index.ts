/**
 * Admin Actions Index
 * 
 * Central export point for all admin actions.
 * Import from this file for cleaner imports in components.
 */

// Category actions
export {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CreateCategoryData,
  type UpdateCategoryData,
} from './categories'

// Style actions
export {
  getStyles,
  getActiveStylesForSelect,
  createStyle,
  updateStyle,
  deleteStyle,
  type Style,
  type StyleSelectOption,
  type CreateStyleData,
  type UpdateStyleData,
} from './styles'

// Occasion actions
export {
  getOccasions,
  getActiveOccasionsForSelect,
  createOccasion,
  updateOccasion,
  deleteOccasion,
  type Occasion,
  type OccasionSelectOption,
  type CreateOccasionData,
  type UpdateOccasionData,
} from './occasions'

// Utility functions
export { extractR2KeyFromUrl } from './utils'

