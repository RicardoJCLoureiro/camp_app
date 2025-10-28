// components/LoadingIndicator.tsx
'use client';

import React from 'react';
import { useLoading } from '@/context/LoadingContext';
import Spinner from './Spinner';

export default function LoadingIndicator() {
  const { loading } = useLoading();
  return loading ? <Spinner /> : null;
}
