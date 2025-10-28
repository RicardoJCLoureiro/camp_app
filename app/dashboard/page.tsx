// app/dashboard/page.tsx
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/authContext';
import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion';
import {
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import ChangePasswordModal from '@/app/dashboard/components/ChagePasswordModal';

type StatCardProps = { title: string; value: string; sublabel?: string; delta?: { text: string; positive?: boolean } };
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

function monthLabel(d: Date) { return d.toLocaleString(undefined, { month: 'short' }); }
/** Mock last 12 months of revenue */
function useLast12MonthsRevenue() {
  return useMemo(() => {
    const now = new Date();
    const series: { name: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const base = 26000;
      const uptrend = (11 - i) * 900;
      const seasonal = Math.round(2000 * Math.sin(((11 - i) / 12) * Math.PI * 2));
      series.push({ name: monthLabel(dt), revenue: base + uptrend + seasonal });
    }
    return series;
  }, []);
}

export default function DashboardPage() {
  const router = useRouter();
  const { loading, loaded, user } = useAuth();
  const { t } = useTranslation('common');
  const revenueData = useLast12MonthsRevenue();

  // 👇 local state controls the modal (no query-string auto-open)
  const [showChangePassword, setShowChangePassword] = useState(false);

   const [showPwd, setShowPwd] = useState(false);

  // event-based open from the menu
  useEffect(() => {
    const handler = () => setShowPwd(true);
    window.addEventListener('open-change-password', handler);
    return () => window.removeEventListener('open-change-password', handler);
  }, []);

  // Auth guard
  useEffect(() => {
    if (!loading && loaded && !user) {
      toast.error(t('dummy.authRequired'));
      router.replace('/');
    }
  }, [loading, loaded, user, router, t]);

  // Listen for the custom event fired by the SlidingMenu
  useEffect(() => {
    const handler = () => setShowChangePassword(true);
    window.addEventListener('open-change-password', handler as EventListener);
    return () => window.removeEventListener('open-change-password', handler as EventListener);
  }, []);

  if (loading || !loaded || !user) return null;

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
        <StatCard title={t('dummy.stats.costs.title')} value="€ 12,480" sublabel={t('dummy.stats.costs.sublabel')} delta={{ text: t('dummy.stats.costs.delta'), positive: false }}/>
        <StatCard title={t('dummy.stats.revenue.title')} value="€ 38,900" sublabel={t('dummy.stats.revenue.sublabel')} delta={{ text: t('dummy.stats.revenue.delta'), positive: true }}/>
        <StatCard title={t('dummy.stats.issues.title')} value={t('dummy.stats.issues.value')} sublabel={t('dummy.stats.issues.sublabel')} delta={{ text: t('dummy.stats.issues.delta'), positive: true }}/>
      </div>

      {/* Stat Cards — Row 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title={t('dummy.stats.aiInvoices.title')} value="124" sublabel={t('dummy.stats.aiInvoices.sublabel')} delta={{ text: t('dummy.stats.aiInvoices.delta'), positive: true }}/>
        <StatCard title={t('dummy.stats.tickets.title')} value="86" sublabel={t('dummy.stats.tickets.sublabel')} delta={{ text: t('dummy.stats.tickets.delta'), positive: true }}/>
        <StatCard title={t('dummy.stats.housesAI.title')} value="42" sublabel={t('dummy.stats.housesAI.sublabel')} delta={{ text: t('dummy.stats.housesAI.delta'), positive: true }}/>
      </div>

      {/* Revenue Chart */}
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
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)' }} formatter={(value) => [`€ ${Number(value).toLocaleString()}`, t('dummy.chart.legend')]}/>
              <Area type="monotone" dataKey="revenue" stroke="#111827" fillOpacity={1} fill="url(#revFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* What's New + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dummy.whatsNew.title')}</h3>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1"><AccordionTrigger>{t('dummy.whatsNew.item1.title')}</AccordionTrigger><AccordionContent>{t('dummy.whatsNew.item1.body')}</AccordionContent></AccordionItem>
            <AccordionItem value="item-2"><AccordionTrigger>{t('dummy.whatsNew.item2.title')}</AccordionTrigger><AccordionContent>{t('dummy.whatsNew.item2.body')}</AccordionContent></AccordionItem>
            <AccordionItem value="item-3"><AccordionTrigger>{t('dummy.whatsNew.item3.title')}</AccordionTrigger><AccordionContent>{t('dummy.whatsNew.item3.body')}</AccordionContent></AccordionItem>
          </Accordion>
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dummy.quickActions.title')}</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary">{t('dummy.quickActions.openIssues')}</Button>
            <Button size="sm" variant="secondary">{t('dummy.quickActions.monthlyReport')}</Button>
          </div>
          <div className="mt-4 text-sm text-gray-500">{t('dummy.quickActions.helper')}</div>
        </div>
      </div>

      {/* Modal mount (controlled by local state, not query string) */}
      <ChangePasswordModal
        isOpen={showPwd}
        onClose={() => setShowPwd(false)} // ✅ user can close anytime
      />
    </div>
  );
}
