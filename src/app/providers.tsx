'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProber } from '@/lib/sync/connectionProber';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos de caché
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    // Iniciar sondeo periódico de conectividad HTTP real al cargar la app
    ConnectionProber.startProbing(10000);
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
