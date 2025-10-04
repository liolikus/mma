import { render, screen } from '@testing-library/react';
import { HealthScore } from '@/components/HealthScore';
import type { WalletHealth } from '@/types';

describe('HealthScore', () => {
  const mockHealthGood: WalletHealth = {
    score: 90,
    riskyApprovals: 0,
    spamTokens: 0,
    dustTokenCount: 2,
    lastUpdated: new Date(),
  };

  const mockHealthBad: WalletHealth = {
    score: 45,
    riskyApprovals: 5,
    spamTokens: 3,
    dustTokenCount: 10,
    lastUpdated: new Date(),
  };

  it('renders health score correctly', () => {
    render(<HealthScore health={mockHealthGood} />);
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('displays correct color for good score', () => {
    render(<HealthScore health={mockHealthGood} />);
    const scoreElement = screen.getByText('90');
    expect(scoreElement).toHaveClass('text-green-600');
  });

  it('displays correct color for bad score', () => {
    render(<HealthScore health={mockHealthBad} />);
    const scoreElement = screen.getByText('45');
    expect(scoreElement).toHaveClass('text-red-600');
  });

  it('shows risky approvals count', () => {
    render(<HealthScore health={mockHealthBad} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
