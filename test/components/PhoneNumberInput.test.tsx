import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PhoneNumberInput from '../../src/components/PhoneNumberInput';

describe('PhoneNumberInput Component', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    value: '',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly with default props', () => {
    render(<PhoneNumberInput {...defaultProps} />);
    
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveAttribute('type', 'tel');
    expect(inputElement).not.toBeDisabled();
  });

  test('renders with provided value', () => {
    render(<PhoneNumberInput {...defaultProps} value="+1234567890" />);
    
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveValue('+1234567890');
  });

  test('renders with custom className', () => {
    render(<PhoneNumberInput {...defaultProps} className="custom-class" />);
    
    const containerDiv = screen.getByRole('textbox').parentElement;
    expect(containerDiv).toHaveClass('custom-class');
  });

  test('is disabled when disabled prop is true', () => {
    render(<PhoneNumberInput {...defaultProps} disabled={true} />);
    
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toBeDisabled();
  });

  test('calls onChange with sanitized value when input changes', () => {
    render(<PhoneNumberInput {...defaultProps} />);
    
    const inputElement = screen.getByRole('textbox');
    
    // Test with valid input (numbers, plus sign, spaces)
    fireEvent.change(inputElement, { target: { value: '+123 456 7890' } });
    expect(mockOnChange).toHaveBeenCalledWith('+123 456 7890');
    
    // Test with invalid characters that should be removed
    fireEvent.change(inputElement, { target: { value: '+123-456-7890abc' } });
    expect(mockOnChange).toHaveBeenCalledWith('+123 456 7890');
  });

  test('sanitizes input by removing non-numeric, non-plus, non-space characters', () => {
    render(<PhoneNumberInput {...defaultProps} />);
    
    const inputElement = screen.getByRole('textbox');
    
    // Test with mixed valid and invalid characters
    fireEvent.change(inputElement, { target: { value: '+1 (234) 567-8900' } });
    
    // Should remove parentheses, dash, and other non-allowed characters
    expect(mockOnChange).toHaveBeenCalledWith('+1 234 5678900');
  });

  test('displays the correct placeholder text', () => {
    render(<PhoneNumberInput {...defaultProps} />);
    
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveAttribute('placeholder', 'form.phoneNumberPlaceholder');
  });
});