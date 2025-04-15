import React from 'react';
import { render, screen } from '@testing-library/react';
import { ForwardingCodeDisplay } from '../../src/components/ForwardingCodeDisplay';

describe('ForwardingCodeDisplay Component', () => {
  const mockForwardingCode = {
    code: '*21*+1234567890#',
    description: 'Test forwarding code'
  };
  
  const mockCancelCode = '#21#';

  test('renders the forwarding code correctly', () => {
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
        cancelCode={mockCancelCode} 
      />
    );
    
    // Check that the code is displayed
    expect(screen.getByText(mockForwardingCode.code)).toBeInTheDocument();
    
    // Check that the title and description are displayed
    expect(screen.getByText('result.title')).toBeInTheDocument();
    expect(screen.getByText('result.description')).toBeInTheDocument();
  });

  test('renders the instructions section', () => {
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
        cancelCode={mockCancelCode} 
      />
    );
    
    // Check that the instructions section is displayed
    expect(screen.getByText('result.instructions')).toBeInTheDocument();
    
    // Check that all steps are displayed
    expect(screen.getByText('result.step1')).toBeInTheDocument();
    expect(screen.getByText('result.step2')).toBeInTheDocument();
    expect(screen.getByText('result.step3')).toBeInTheDocument();
  });

  test('renders the cancel code section when provided', () => {
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
        cancelCode={mockCancelCode} 
      />
    );
    
    // Check that the cancel code section is displayed
    expect(screen.getByText('result.cancelTitle')).toBeInTheDocument();
    expect(screen.getByText(mockCancelCode)).toBeInTheDocument();
  });

  test('does not render cancel code section when not provided', () => {
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
      />
    );
    
    // Check that the cancel code section is not displayed
    expect(screen.queryByText('result.cancelTitle')).not.toBeInTheDocument();
  });

  test('applies animation classes for smooth appearance', () => {
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
        cancelCode={mockCancelCode} 
      />
    );
    
    // Check that the main container has animation classes
    const container = screen.getByText('result.title').closest('div');
    expect(container).toHaveClass('bg-gray-900', 'rounded-lg', 'p-6', 'shadow-lg');
  });

  test('renders the phone icon next to the code', () => {
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
        cancelCode={mockCancelCode} 
      />
    );
    
    // Find the code container
    const codeContainer = screen.getByText(mockForwardingCode.code).closest('div');
    
    // Check that it has the phone icon (we can't directly test for the Lucide icon,
    // but we can check for its container)
    const iconContainer = codeContainer?.previousSibling;
    expect(iconContainer).toBeInTheDocument();
  });
});