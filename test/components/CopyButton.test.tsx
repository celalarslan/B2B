import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Copy, Check } from 'lucide-react';
import { ForwardingCodeDisplay } from '../../src/components/ForwardingCodeDisplay';

// Mock the navigator.clipboard.writeText function
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe('CopyButton in ForwardingCodeDisplay Component', () => {
  const mockForwardingCode = {
    code: '*21*+1234567890#',
    description: 'Test forwarding code'
  };
  
  const mockCancelCode = '#21#';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders copy button with correct icon', () => {
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
        cancelCode={mockCancelCode} 
      />
    );
    
    // Find the copy button (it might not have text, so we look for the aria-label)
    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
    
    // Check that it initially shows the Copy icon
    const copyIcon = document.querySelector('svg');
    expect(copyIcon).toBeInTheDocument();
  });

  test('copies text to clipboard when clicked', async () => {
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
        cancelCode={mockCancelCode} 
      />
    );
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    // Verify clipboard API was called with the correct text
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockForwardingCode.code);
  });

  test('shows check icon and "Copied!" text after clicking', async () => {
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
        cancelCode={mockCancelCode} 
      />
    );
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    // Check that the "Copied!" text appears
    const copiedText = await screen.findByText('result.copied');
    expect(copiedText).toBeInTheDocument();
    
    // Wait for the icon to change back after the timeout
    await waitFor(() => {
      expect(screen.queryByText('result.copied')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('reverts back to copy icon after timeout', async () => {
    jest.useFakeTimers();
    
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
        cancelCode={mockCancelCode} 
      />
    );
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    // Fast-forward time
    jest.advanceTimersByTime(2000);
    
    // Check that the "Copied!" text is no longer visible
    expect(screen.queryByText('result.copied')).not.toBeInTheDocument();
    
    jest.useRealTimers();
  });

  test('handles errors when clipboard API fails', async () => {
    // Mock clipboard API to reject
    navigator.clipboard.writeText = jest.fn().mockRejectedValue(new Error('Clipboard error'));
    
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ForwardingCodeDisplay 
        forwardingCode={mockForwardingCode} 
        cancelCode={mockCancelCode} 
      />
    );
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    // Verify error was logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    
    consoleErrorSpy.mockRestore();
  });
});