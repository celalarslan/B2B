import { supabase } from '../supabase';
import { Country, Operator } from '../../types/operators';

/**
 * Fetches all countries with their operators from Supabase
 */
export async function fetchCountriesWithOperators(): Promise<Country[]> {
  try {
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('*')
      .order('name');

    if (countriesError) throw countriesError;

    const { data: operators, error: operatorsError } = await supabase
      .from('operators')
      .select('*')
      .eq('active', true);

    if (operatorsError) throw operatorsError;

    // Group operators by country
    return countries.map(country => ({
      code: country.code,
      name: country.name,
      flag: country.flag,
      operators: operators.filter(op => op.country_code === country.code)
    }));
  } catch (error) {
    console.error('Error fetching countries and operators:', error);
    throw error;
  }
}

/**
 * Fetches operators for a specific country
 */
export async function fetchOperatorsByCountry(countryCode: string): Promise<Operator[]> {
  try {
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .eq('country_code', countryCode)
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching operators for country ${countryCode}:`, error);
    throw error;
  }
}

/**
 * Generates a call forwarding code based on operator and phone number
 */
export function generateForwardingCode(operator: Operator, phoneNumber: string): string {
  // Replace any placeholder in the code with the actual phone number
  return operator.forward_code.replace('{phone}', phoneNumber);
}

/**
 * Generates a call forwarding cancellation code
 */
export function generateCancellationCode(operator: Operator): string {
  return operator.cancel_code;
}