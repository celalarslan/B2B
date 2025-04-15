import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForwardingForm from '../../src/components/ForwardingForm';
import { useForwardingStore } from '../../src/store/forwardingStore';

// Mock the forwardingStore
jest.mock('../../src/store/forwardingStore', () => ({
  useForwardingStore: jest.fn(),
}));

describe('ForwardingForm Component', () => {
  // Default mock implementation for the store
  const mockStore = {
    countries: [
      { 
        code: 'US', 
        name: 'United States', 
        flag: '🇺🇸',
        operators: [
          { id: '1', name: 'AT&T', forward_code: '*21*{phone}#', cancel_code: '#21#' },
          { id: '2', name: 'Verizon', forward_code: '*71{phone}#', cancel_code: '*73#' },
        ]
      },
      { 
        code: 'TR', 
        name: 'Turkey', 
        flag: '🇹🇷',
        operators: [
          { id: '3', name: 'Turkcell', forward_code: '*21*{phone}#', cancel_code: '#21#' },
        ]
      },
    ],
    selectedCountry: null,
    selectedOperator: null,
    phoneNumber: '',
    forwardingCode: null,
    isLoading: false,
    error: null,
    fetchCountries: jest.fn(),
    setSelectedCountry: jest.fn(),
    setSelectedOperator: jest.fn(),
    setPhoneNumber: jest.fn(),
    generateCode: jest.fn(),
    resetForm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useForwardingStore as jest.Mock).mockImplementation(() => mockStore);
  });

  test('renders loading state correctly', () => {
    (useForwardingStore as jest.Mock).mockImplementation(() => ({
      ...mockStore,
      isLoading: true,
      countries: [],
    }));
    
    render(<ForwardingForm />);
    
    // Check that loading spinner is displayed
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('renders error message when there is an error', () => {
    (useForwardingStore as jest.Mock).mockImplementation(() => ({
      ...mockStore,
      error: 'Failed to load countries',
    }));
    
    render(<ForwardingForm />);
    
    // Check that error message is displayed
    expect(screen.getByText('Failed to load countries')).toBeInTheDocument();
  });

  test('renders form fields when data is loaded', () => {
    render(<ForwardingForm />);
    
    // Check that form fields are displayed
    expect(screen.getByText('form.country')).toBeInTheDocument();
    expect(screen.getByText('form.operator')).toBeInTheDocument();
    expect(screen.getByText('form.phoneNumber')).toBeInTheDocument();
  });

  test('calls fetchCountries on mount', () => {
    render(<ForwardingForm />);
    
    // Check that fetchCountries was called
    expect(mockStore.fetchCountries).toHaveBeenCalled();
  });

  test('selects country when country selector is clicked', async () => {
    render(<ForwardingForm />);
    
    // Click the country selector
    fireEvent.click(screen.getByText('form.selectCountry'));
    
    // Select a country
    fireEvent.click(screen.getByText('United States'));
    
    // Check that setSelectedCountry was called with the right country
    expect(mockStore.setSelectedCountry).toHaveBeenCalledWith(mockStore.countries[0]);
  });

  test('selects operator when operator selector is clicked', async () => {
    // Mock selected country
    (useForwardingStore as jest.Mock).mockImplementation(() => ({
      ...mockStore,
      selectedCountry: mockStore.countries[0],
    }));
    
    render(<ForwardingForm />);
    
    // Click the operator selector
    fireEvent.click(screen.getByText('form.selectOperator'));
    
    // Select an operator
    fireEvent.click(screen.getByText('AT&T'));
    
    // Check that setSelectedOperator was called with the right operator
    expect(mockStore.setSelectedOperator).toHaveBeenCalledWith(mockStore.countries[0].operators[0]);
  });

  test('updates phone number when input changes', () => {
    render(<ForwardingForm />);
    
    // Find the phone number input
    const phoneInput = screen.getByLabelText('form.phoneNumber');
    
    // Change the input value
    fireEvent.change(phoneInput, { target: { value: '+1234567890' } });
    
    // Check that setPhoneNumber was called with the right value
    expect(mockStore.setPhoneNumber).toHaveBeenCalledWith('+1234567890');
  });

  test('generates code when form is submitted', async () => {
    // Mock selected country, operator, and phone number
    (useForwardingStore as jest.Mock).mockImplementation(() => ({
      ...mockStore,
      selectedCountry: mockStore.countries[0],
      selectedOperator: mockStore.countries[0].operators[0],
      phoneNumber: '+1234567890',
    }));
    
    render(<ForwardingForm />);
    
    // Submit the form
    fireEvent.click(screen.getByText('form.generate'));
    
    // Check that generateCode was called
    expect(mockStore.generateCode).toHaveBeenCalled();
  });

  test('disables generate button when required fields are missing', () => {
    // Mock selected country but no operator or phone number
    (useForwardingStore as jest.Mock).mockImplementation(() => ({
      ...mockStore,
      selectedCountry: mockStore.countries[0],
      selectedOperator: null,
      phoneNumber: '',
    }));
    
    render(<ForwardingForm />);
    
    // Check that generate button is disabled
    const generateButton = screen.getByText('form.generate');
    expect(generateButton).toBeDisabled();
  });

  test('renders ForwardingCodeDisplay when code is generated', () => {
    // Mock forwarding code
    (useForwardingStore as jest.Mock).mockImplementation(() => ({
      ...mockStore,
      forwardingCode: {
        code: '*21*+1234567890#',
        description: 'Test forwarding code',
      },
      selectedOperator: {
        id: '1',
        name: 'AT&T',
        forward_code: '*21*{phone}#',
        cancel_code: '#21#',
      },
    }));
    
    render(<ForwardingForm />);
    
    // Check that ForwardingCodeDisplay is rendered
    expect(screen.getByText('result.title')).toBeInTheDocument();
    expect(screen.getByText('*21*+1234567890#')).toBeInTheDocument();
  });

  test('resets form when reset button is clicked', () => {
    render(<ForwardingForm />);
    
    // Find and click the reset button (it has a RefreshCw icon)
    const resetButton = screen.getByRole('button', { name: '' }); // Reset button has no text, just an icon
    fireEvent.click(resetButton);
    
    // Check that resetForm was called
    expect(mockStore.resetForm).toHaveBeenCalled();
  });
});