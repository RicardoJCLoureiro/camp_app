// app/dashboard/page.tsx
'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/authContext';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type StatCardProps = {
  title: string;
  value: string;
  sublabel?: string;
  delta?: { text: string; positive?: boolean };
};

function StatCard({ title, value, sublabel, delta }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5 flex flex-col gap-2">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      {sublabel && <div className="text-xs text-gray-500">{sublabel}</div>}
      {delta && (
        <div
          className={[
            'mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
            delta.positive
              ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20'
              : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
          ].join(' ')}
        >
          {delta.text}
        </div>
      )}
    </div>
  );
}

function monthLabel(d: Date) {
  return d.toLocaleString(undefined, { month: 'short' });
}

/** Mock last 12 months of revenue (newest last) */
function useLast12MonthsRevenue() {
  return useMemo(() => {
    const now = new Date();
    const series: { name: string; revenue: number }[] = [];

    // generate 12 months, oldest -> newest
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);

      // Simple synthetic revenue curve:
      // base + seasonal wiggle + gentle uptrend
      const base = 26000;
      const uptrend = (11 - i) * 900; // +€900 each month
      const seasonal = Math.round(2000 * Math.sin(((11 - i) / 12) * Math.PI * 2));
      const rev = base + uptrend + seasonal;

      series.push({ name: monthLabel(dt), revenue: rev });
    }
    return series;
  }, []);
}

export default function DashboardPage() {
  const router = useRouter();
  const { loading, loaded, user } = useAuth();
  const { t } = useTranslation('common');

  // Auth guard (page-level)
  useEffect(() => {
    if (!loading && loaded && !user) {
      toast.error(t('dummy.authRequired'));
      router.replace('/');
    }
  }, [loading, loaded, user, router, t]);

  if (loading || !loaded || !user) return null;

  // Hard-coded stats (row 1)
  const statsRow1 = {
    costs: {
      title: t('dummy.stats.costs.title'),
      value: '€ 12,480',
      sublabel: t('dummy.stats.costs.sublabel'),
      delta: { text: t('dummy.stats.costs.delta'), positive: false },
    },
    revenue: {
      title: t('dummy.stats.revenue.title'),
      value: '€ 38,900',
      sublabel: t('dummy.stats.revenue.sublabel'),
      delta: { text: t('dummy.stats.revenue.delta'), positive: true },
    },
    issues: {
      title: t('dummy.stats.issues.title'),
      value: t('dummy.stats.issues.value'),
      sublabel: t('dummy.stats.issues.sublabel'),
      delta: { text: t('dummy.stats.issues.delta'), positive: true },
    },
  };

  // Additional 3 cards (row 2)
  const statsRow2 = {
    aiInvoices: {
      title: t('dummy.stats.aiInvoices.title'),
      value: '124',
      sublabel: t('dummy.stats.aiInvoices.sublabel'),
      delta: { text: t('dummy.stats.aiInvoices.delta'), positive: true },
    },
    tickets: {
      title: t('dummy.stats.tickets.title'),
      value: '86',
      sublabel: t('dummy.stats.tickets.sublabel'),
      delta: { text: t('dummy.stats.tickets.delta'), positive: true },
    },
    housesAI: {
      title: t('dummy.stats.housesAI.title'),
      value: '42',
      sublabel: t('dummy.stats.housesAI.sublabel'),
      delta: { text: t('dummy.stats.housesAI.delta'), positive: true },
    },
  };

  const revenueData = useLast12MonthsRevenue();

  return (
    <div className="space-y-8">
      {/* Header / Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('dummy.header.title')}</h1>
          <p className="text-sm text-gray-500">{t('dummy.header.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button>{t('dummy.actions.export')}</Button>
        </div>
      </div>

      {/* Stat Cards — Row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title={statsRow1.costs.title}
          value={statsRow1.costs.value}
          sublabel={statsRow1.costs.sublabel}
          delta={statsRow1.costs.delta}
        />
        <StatCard
          title={statsRow1.revenue.title}
          value={statsRow1.revenue.value}
          sublabel={statsRow1.revenue.sublabel}
          delta={statsRow1.revenue.delta}
        />
        <StatCard
          title={statsRow1.issues.title}
          value={statsRow1.issues.value}
          sublabel={statsRow1.issues.sublabel}
          delta={statsRow1.issues.delta}
        />
      </div>

      {/* Stat Cards — Row 2 (new) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title={statsRow2.aiInvoices.title}
          value={statsRow2.aiInvoices.value}
          sublabel={statsRow2.aiInvoices.sublabel}
          delta={statsRow2.aiInvoices.delta}
        />
        <StatCard
          title={statsRow2.tickets.title}
          value={statsRow2.tickets.value}
          sublabel={statsRow2.tickets.sublabel}
          delta={statsRow2.tickets.delta}
        />
        <StatCard
          title={statsRow2.housesAI.title}
          value={statsRow2.housesAI.value}
          sublabel={statsRow2.housesAI.sublabel}
          delta={statsRow2.housesAI.delta}
        />
      </div>

      {/* Revenue Chart — last 12 months */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('dummy.chart.title')}</h2>
            <p className="text-sm text-gray-500">{t('dummy.chart.subtitle')}</p>
          </div>
          <Button variant="secondary">{t('dummy.actions.viewDetails')}</Button>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)' }}
                formatter={(value) => [`€ ${Number(value).toLocaleString()}`, t('dummy.chart.legend')]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#111827" fillOpacity={1} fill="url(#revFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* What’s New + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dummy.whatsNew.title')}</h3>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>{t('dummy.whatsNew.item1.title')}</AccordionTrigger>
              <AccordionContent>{t('dummy.whatsNew.item1.body')}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>{t('dummy.whatsNew.item2.title')}</AccordionTrigger>
              <AccordionContent>{t('dummy.whatsNew.item2.body')}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>{t('dummy.whatsNew.item3.title')}</AccordionTrigger>
              <AccordionContent>{t('dummy.whatsNew.item3.body')}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dummy.quickActions.title')}</h3>
          <div className="flex flex-wrap gap-2">
            {/* removed: Invite user, Create invoice */}
            <Button size="sm" variant="secondary">{t('dummy.quickActions.openIssues')}</Button>
            <Button size="sm" variant="secondary">{t('dummy.quickActions.monthlyReport')}</Button>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {t('dummy.quickActions.helper')}
          </div>
        </div>
      </div>
    </div>
  );
}
