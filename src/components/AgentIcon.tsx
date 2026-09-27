import React from 'react';
import {
  Sparkles,
  GraduationCap,
  FileSpreadsheet,
  BarChart3,
  Stethoscope,
  HeartHandshake,
  Compass,
  Scale,
  Dumbbell,
  Code,
  Bot,
  Mail,
  Wallet,
  UtensilsCrossed,
  Plane,
  Briefcase,
  Flame,
  LucideProps,
} from 'lucide-react';

interface AgentIconProps extends LucideProps {
  name: string;
}

export function AgentIcon({ name, ...props }: AgentIconProps) {
  switch (name) {
    case 'Sparkles':
      return <Sparkles {...props} />;
    case 'GraduationCap':
      return <GraduationCap {...props} />;
    case 'FileSpreadsheet':
      return <FileSpreadsheet {...props} />;
    case 'BarChart3':
      return <BarChart3 {...props} />;
    case 'Stethoscope':
      return <Stethoscope {...props} />;
    case 'HeartHandshake':
      return <HeartHandshake {...props} />;
    case 'Compass':
      return <Compass {...props} />;
    case 'Scale':
      return <Scale {...props} />;
    case 'Dumbbell':
      return <Dumbbell {...props} />;
    case 'Code':
      return <Code {...props} />;
    case 'Mail':
      return <Mail {...props} />;
    case 'Wallet':
      return <Wallet {...props} />;
    case 'UtensilsCrossed':
      return <UtensilsCrossed {...props} />;
    case 'Plane':
      return <Plane {...props} />;
    case 'Briefcase':
      return <Briefcase {...props} />;
    case 'Flame':
      return <Flame {...props} />;
    case 'Bot':
    default:
      return <Bot {...props} />;
  }
}
