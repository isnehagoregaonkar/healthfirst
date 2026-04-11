/**
 * Tapping a chip fills search with the same text as the label and runs the catalog query.
 */
export const STAPLE_SEARCH_SUGGESTIONS = [
  'Eggs',
  'Oatmeal',
  'Banana',
  'Milk',
  'Rice',
  'Chicken',
  'Yogurt',
  'Bread',
  'Apple',
  'Coffee',
  'Salad',
  'Peanut butter',
  'Avocado',
  'Sweet potato',
  'Salmon',
  'Tuna',
  'Pasta',
  'Cheese',
  'Orange',
  'Broccoli',
  'Almonds',
  'Beans',
  'Turkey',
  'Cottage cheese',
  'Protein shake',
  'Granola',
  'Hummus',
  'Tortilla',
  'Potato',
  'Spinach',
  'Strawberries',
] as const;

export type StapleSearchLabel = (typeof STAPLE_SEARCH_SUGGESTIONS)[number];
