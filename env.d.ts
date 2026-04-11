declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  /** USDA FoodData Central API key (https://fdc.nal.usda.gov/api-key-signup.html) */
  export const USDA_FDC_API_KEY: string;
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { Component } from 'react';
  import { IconProps } from 'react-native-vector-icons/Icon';
  export default class MaterialCommunityIcons extends Component<IconProps> {}
}
