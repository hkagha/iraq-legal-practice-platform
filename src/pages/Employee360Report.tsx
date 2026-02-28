import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useEmployee360Data } from '@/hooks/useEmployee360Data';
import { type DateRangePreset } from '@/hooks/useReportData';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Download, ShieldAlert, Star } from 'lucide-react';

const COLORS = {
  gold: 'hsl(42, 50%, 54%)',
  slate: 'hsl(215, 16%, 80%)',
  green: 'hsl(142, 71%, 45%)',
  red: 'hsl(0, 84%, 60%)',
  amber: 'hsl(38, 92%, 50%)',
  blue: 'hsl(217, 91%, 60%)',
};

function formatIQD(amount: number) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toLocaleString();
}

function utilizationColor(rate: number) {
  if (rate >= 75) return 'text-success';
  if (rate >= 50) return 'text-warning';
  return 'text-destructive';
}

export default function Employee360Report() {
  const { t, language, isRTL } = useLanguage();
  const { isRole, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isRole('firm_admin');

  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showTeam, setShowTeam] = useState(false);

  const { data, loading, members } = useEmployee360Data(preset, showTeam ? null : selectedUserId);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <ShieldAlert size={48} className="text-muted-foreground" />
        <p className="text-heading-md text-foreground">{language === 'ar' ? 'ليس لديك صلاحية لعرض هذا التقرير' : "You don't have access to this report"}</p>
        <Button variant="outline" onClick={() => navigate('/reports')}>{t('common.back')}</Button>
      </div>
    );
  }

  const presetOptions = [
    { value: 'this_month', label: t('reports.thisMonth') },
    { value: 'last_month', label: t('reports.lastMonth') },
    { value: 'this_quarter', label: t('reports.thisQuarter') },
    { value: 'this_year', label: t('reports.thisYear') },
  ];

  const selectedMember = members.find(m => m.id === selectedUserId);
  const ind = data?.individual;
  const team = data?.team;

  return (
    <div className="print:p-0">
      <PageHeader
        title="Employee 360°"
        titleAr="تقييم الموظف ٣٦٠°"
        breadcrumbs={[
          { label: 'Dashboard', labelAr: 'لوحة التحكم', href: '/dashboard' },
          { label: 'Reports', labelAr: 'التقارير', href: '/reports' },
          { label: 'Employee 360°', labelAr: 'تقييم الموظف ٣٦٠°' },
        ]}
        secondaryActions={[
          { label: 'Export PDF', labelAr: 'تصدير PDF', icon: Download, onClick: () => window.print() },
        ]}
      />

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <Select value={preset} onValueChange={(v) => setPreset(v as DateRangePreset)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {presetOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {!showTeam && (
          <Select value={selectedUserId || ''} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-60"><SelectValue placeholder={language === 'ar' ? 'اختر عضو الفريق' : 'Select Team Member'} /></SelectTrigger>
            <SelectContent>
              {members.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {language === 'ar' ? `${m.first_name_ar || m.first_name} ${m.last_name_ar || m.last_name}` : `${m.first_name} ${m.last_name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-2 ms-auto">
          <span className="text-body-sm text-muted-foreground">{language === 'ar' ? 'عرض الفريق كاملاً' : 'View All Team'}</span>
          <Switch checked={showTeam} onCheckedChange={(v) => { setShowTeam(v); if (v) setSelectedUserId(null); }} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">{t('reports.generating')}</div>
      ) : showTeam && team ? (
        <TeamComparisonView team={team} language={language} members={members} onSelectMember={(id) => { setSelectedUserId(id); setShowTeam(false); }} />
      ) : ind && selectedMember ? (
        <IndividualView data={ind} member={selectedMember} language={language} />
      ) : (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          {language === 'ar' ? 'اختر عضو فريق لعرض أدائه' : 'Select a team member to view their performance'}
        </div>
      )}
    </div>
  );
}

function IndividualView({ data, member, language }: { data: any; member: any; language: string }) {
  const name = language === 'ar'
    ? `${member.first_name_ar || member.first_name} ${member.last_name_ar || member.last_name}`
    : `${member.first_name} ${member.last_name}`;
  const initials = (member.first_name?.[0] || '') + (member.last_name?.[0] || '');

  return (
    <>
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={member.avatar_url || ''} />
          <AvatarFallback className="text-lg">{initials.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-heading-lg text-foreground">{name}</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{member.role}</Badge>
            <span className="text-body-sm text-muted-foreground">{member.email}</span>
          </div>
          <p className="text-body-sm text-muted-foreground mt-0.5">
            {language === 'ar' ? 'عضو منذ' : 'Member since'} {format(new Date(member.created_at), 'MMM yyyy')}
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <KPI label={language === 'ar' ? 'القضايا' : 'Cases Handled'} value={data.casesHandled} />
        <KPI label={language === 'ar' ? 'ساعات قابلة للفوترة' : 'Billable Hours'} value={`${data.billableHours}h`} />
        <KPI label={language === 'ar' ? 'نسبة الاستخدام' : 'Utilization Rate'} value={`${data.utilizationRate}%`}>
          <Progress value={data.utilizationRate} className="h-2 mt-2" />
        </KPI>
        <KPI label={language === 'ar' ? 'مهام مكتملة' : 'Tasks Completed'} value={data.completedTasks} />
        <KPI label={language === 'ar' ? 'المستندات' : 'Documents'} value={data.documentsUploaded} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'الساعات يومياً' : 'Hours per Day'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.hoursPerDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={8} stroke={COLORS.red} strokeDasharray="3 3" label="Target" />
                <Bar dataKey="billable" name={language === 'ar' ? 'قابلة للفوترة' : 'Billable'} stackId="a" fill={COLORS.gold} radius={[2, 2, 0, 0]} />
                <Bar dataKey="nonBillable" name={language === 'ar' ? 'غير قابلة' : 'Non-Billable'} stackId="a" fill={COLORS.slate} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'توزيع الوقت' : 'Time by Case'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.timeByCase.slice(0, 8)} dataKey="hours" nameKey="caseId" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                  {data.timeByCase.slice(0, 8).map((_: any, i: number) => (
                    <Cell key={i} fill={['hsl(42,50%,54%)', 'hsl(217,91%,60%)', 'hsl(142,71%,45%)', 'hsl(262,52%,47%)', 'hsl(0,84%,60%)', 'hsl(38,92%,50%)', 'hsl(200,80%,50%)', 'hsl(280,60%,55%)'][i % 8]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}h`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'اتجاه إكمال المهام' : 'Task Completion Trend'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.taskTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke={COLORS.gold} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'نتائج القضايا' : 'Case Outcomes'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: language === 'ar' ? 'مكسوبة' : 'Won', value: data.outcomes.won, fill: COLORS.green },
                  { name: language === 'ar' ? 'خاسرة' : 'Lost', value: data.outcomes.lost, fill: COLORS.red },
                  { name: language === 'ar' ? 'تسوية' : 'Settled', value: data.outcomes.settled, fill: COLORS.amber },
                  { name: language === 'ar' ? 'مغلقة' : 'Closed', value: data.outcomes.closed, fill: COLORS.slate },
                ]}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: 'hsl(215,16%,47%)' }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: 'hsl(215,16%,47%)' }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {[COLORS.green, COLORS.red, COLORS.amber, COLORS.slate].map((c, i) => <Cell key={i} fill={c} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Stats Table */}
      <Card>
        <CardHeader><CardTitle className="text-heading-sm">{language === 'ar' ? 'إحصائيات تفصيلية' : 'Detailed Stats'}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {[
              [language === 'ar' ? 'إجمالي الساعات' : 'Total Hours Logged', `${data.totalHours}h`],
              [language === 'ar' ? 'ساعات قابلة للفوترة' : 'Billable Hours', `${data.billableHours}h`],
              [language === 'ar' ? 'ساعات غير قابلة' : 'Non-Billable Hours', `${data.nonBillableHours}h`],
              [language === 'ar' ? 'نسبة الاستخدام' : 'Utilization Rate', `${data.utilizationRate}%`],
              [language === 'ar' ? 'متوسط ساعات/يوم' : 'Average Hours/Day', `${data.avgHoursPerDay}h`],
              [language === 'ar' ? 'قضايا كمحامي رئيسي' : 'Cases as Lead', data.casesAsLead],
              [language === 'ar' ? 'قضايا كعضو فريق' : 'Cases as Team Member', data.casesAsMember],
              [language === 'ar' ? 'معاملات مسندة' : 'Errands Assigned', data.errandsAssigned],
              [language === 'ar' ? 'معاملات مكتملة' : 'Errands Completed', data.completedErrands],
              [language === 'ar' ? 'مهام مكتملة' : 'Tasks Completed', data.completedTasks],
              [language === 'ar' ? 'مهام متأخرة' : 'Overdue Tasks', data.overdueTasks],
              [language === 'ar' ? 'مستندات مرفوعة' : 'Documents Uploaded', data.documentsUploaded],
              [language === 'ar' ? 'ملاحظات مكتوبة' : 'Notes Written', data.notesWritten],
            ].map(([label, value], i) => (
              <div key={i} className="flex justify-between py-2 border-b border-border/50">
                <span className="text-body-sm text-muted-foreground">{label}</span>
                <span className="text-body-md font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function TeamComparisonView({ team, language, members, onSelectMember }: { team: any[]; language: string; members: any[]; onSelectMember: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<string>('totalHours');
  const sorted = [...team].sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0));
  const topRevIdx = sorted.length > 0 ? 0 : -1;

  const getName = (m: any) => language === 'ar'
    ? `${m.member.first_name_ar || m.member.first_name} ${m.member.last_name_ar || m.member.last_name}`
    : `${m.member.first_name} ${m.member.last_name}`;

  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'العضو' : 'Member'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الدور' : 'Role'}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey('totalHours')}>{language === 'ar' ? 'الساعات' : 'Hours'}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey('billableHours')}>{language === 'ar' ? 'قابلة للفوترة' : 'Billable'}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey('utilizationRate')}>{language === 'ar' ? 'الاستخدام' : 'Utilization'}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey('casesHandled')}>{language === 'ar' ? 'القضايا' : 'Cases'}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey('completedTasks')}>{language === 'ar' ? 'المهام' : 'Tasks Done'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row, i) => {
                  const initials = (row.member.first_name?.[0] || '') + (row.member.last_name?.[0] || '');
                  return (
                    <TableRow key={row.member.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectMember(row.member.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {i === topRevIdx && <Star size={14} className="text-accent fill-accent" />}
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={row.member.avatar_url || ''} />
                            <AvatarFallback className="text-xs">{initials.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{getName(row)}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{row.member.role}</Badge></TableCell>
                      <TableCell>{row.totalHours}h</TableCell>
                      <TableCell>{row.billableHours}h</TableCell>
                      <TableCell><span className={cn('font-medium', utilizationColor(row.utilizationRate))}>{row.utilizationRate}%</span></TableCell>
                      <TableCell>{row.casesHandled}</TableCell>
                      <TableCell>{row.completedTasks}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Team Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'الساعات حسب العضو' : 'Hours by Member'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 45)}>
              <BarChart data={sorted.map(r => ({ name: getName(r), billable: r.billableHours, nonBillable: r.nonBillableHours }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: 'hsl(215,16%,47%)' }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: 'hsl(215,16%,47%)', fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="billable" name={language === 'ar' ? 'قابلة للفوترة' : 'Billable'} stackId="a" fill={COLORS.gold} />
                <Bar dataKey="nonBillable" name={language === 'ar' ? 'غير قابلة' : 'Non-Billable'} stackId="a" fill={COLORS.slate} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-heading-sm">{language === 'ar' ? 'مقارنة الاستخدام' : 'Utilization Comparison'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 45)}>
              <BarChart data={sorted.map(r => ({ name: getName(r), rate: r.utilizationRate }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(215,16%,47%)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(215,16%,47%)' }} domain={[0, 100]} />
                <Tooltip />
                <ReferenceLine y={75} stroke={COLORS.green} strokeDasharray="3 3" label="Target 75%" />
                <Bar dataKey="rate" name={language === 'ar' ? 'نسبة الاستخدام' : 'Utilization %'} radius={[4, 4, 0, 0]}>
                  {sorted.map((r, i) => <Cell key={i} fill={r.utilizationRate >= 75 ? COLORS.green : r.utilizationRate >= 50 ? COLORS.amber : COLORS.red} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function KPI({ label, value, children }: { label: string; value: string | number; children?: React.ReactNode }) {
  return (
    <Card className="border">
      <CardContent className="p-4">
        <p className="text-body-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-display-sm text-foreground">{value}</p>
        {children}
      </CardContent>
    </Card>
  );
}
