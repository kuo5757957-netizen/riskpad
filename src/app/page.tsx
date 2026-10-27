import { Disclaimer } from '@/components/Disclaimer';
import { Hero } from '@/components/Hero';
import { HowTo } from '@/components/HowTo';
import { LiquidationTool } from '@/components/LiquidationTool';
import { PositionSizeTool } from '@/components/PositionSizeTool';
import { RiskRewardTool } from '@/components/RiskRewardTool';

export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <PositionSizeTool />
      <RiskRewardTool />
      <LiquidationTool />
      <HowTo />
      <Disclaimer />
    </main>
  );
}
