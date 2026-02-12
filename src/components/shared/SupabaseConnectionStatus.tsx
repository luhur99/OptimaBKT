import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

interface SupabaseConnectionStatusProps {
  showLabel?: boolean;
  compact?: boolean;
}

export function SupabaseConnectionStatus({ 
  showLabel = true, 
  compact = false 
}: SupabaseConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      setStatus('checking');
      const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('Supabase connection check failed:', error);
        setStatus('disconnected');
      } else {
        setStatus('connected');
      }
      setLastChecked(new Date());
    } catch (error) {
      console.error('Supabase connection check error:', error);
      setStatus('disconnected');
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    checkConnection();
    
    // Re-check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [checkConnection]);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'checking':
        return <AlertCircle className="h-4 w-4 text-yellow-400 animate-pulse" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'disconnected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'checking':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'checking':
        return 'Checking...';
    }
  };

  const getTooltipText = () => {
    const baseText = status === 'connected' 
      ? 'Supabase connection is active' 
      : status === 'disconnected'
      ? 'Supabase connection failed'
      : 'Checking Supabase connection...';
    
    if (lastChecked && status !== 'checking') {
      const timeAgo = Math.floor((Date.now() - lastChecked.getTime()) / 1000);
      return `${baseText} (checked ${timeAgo}s ago)`;
    }
    
    return baseText;
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            {getStatusIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${getStatusColor()} cursor-help`}>
          <span className="flex items-center gap-1.5">
            {getStatusIcon()}
            {showLabel && <span className="text-xs">{getStatusText()}</span>}
          </span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
