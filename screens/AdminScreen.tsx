import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BarChart, Donut, HBar, SvgLegend } from '../components/Charts';
import { Shell, useLayout } from '../components/Shell';
import { Avatar, Button, Card, Chip, EmptyState, Field, SectionHeader, Tag, Txt } from '../components/ui';
import { EXAMS, RESOURCES, PYQS, TESTS } from '../lib/data';
import { useStore } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

type Tab = 'overview' | 'learners' | 'content' | 'announce';

export default function AdminScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state, dispatch } = useStore();
  const { isMobile, isDesktop } = useLayout();
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('All learners');
  const [published, setPublished] = useState(false);

  const isAdmin = state.user?.role === 'admin';

  const learners = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.learners.filter((l) => !q || `${l.name} ${l.email} ${l.exam}`.toLowerCase().includes(q));
  }, [state.learners, search]);

  const kpis = useMemo(() => {
    const active = state.learners.filter((l) => l.status === 'active').length;
    const avg = Math.round(state.learners.reduce((a, b) => a + b.avgScore, 0) / state.learners.length);
    const tests = state.learners.reduce((a, b) => a + b.tests, 0);
    const pending = state.queue.filter((q) => q.status === 'pending').length;
    return { active, avg, tests, pending };
  }, [state.learners, state.queue]);

  const examSplit = useMemo(
    () =>
      EXAMS.map((e) => ({
        label: e.short,
        value: state.learners.filter((l) => l.exam === e.id).length,
        color: e.color,
      })).filter((x) => x.value > 0),
    [state.learners]
  );

  const weekly = [
    { label: 'Mon', value: 1240 },
    { label: 'Tue', value: 1580 },
    { label: 'Wed', value: 1410 },
    { label: 'Thu', value: 1760 },
    { label: 'Fri', value: 1930 },
    { label: 'Sat', value: 2240 },
    { label: 'Sun', value: 1690 },
  ];

  if (!isAdmin) {
    return (
      <Shell active="Admin" title="Admin Portal" subtitle="Restricted area">
        <Card>
          <EmptyState
            icon="lock-closed-outline"
            title="Administrator access required"
            body="Sign in with the admin demo account (admin@sakha.in / admin123) to manage learners, approve content and publish announcements."
            action="Go to profile"
            onAction={() => nav.navigate('Profile')}
          />
        </Card>
      </Shell>
    );
  }

  const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'overview', label: 'Overview', icon: 'speedometer-outline' },
    { key: 'learners', label: 'Learners', icon: 'people-outline' },
    { key: 'content', label: 'Approvals', icon: 'checkmark-done-outline' },
    { key: 'announce', label: 'Announcements', icon: 'megaphone-outline' },
  ];

  return (
    <Shell active="Admin" title="Admin Portal" subtitle="Platform health, learner management and content governance">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <Chip key={t.key} label={t.label} icon={t.icon} active={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </View>

      {tab === 'overview' ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { l: 'Active learners', v: `${kpis.active}`, s: `${state.learners.length} total`, i: 'people-outline' as const, c: colors.blue },
              { l: 'Avg. mock score', v: `${kpis.avg}%`, s: 'across all exams', i: 'stats-chart-outline' as const, c: colors.teal },
              { l: 'Tests attempted', v: kpis.tests.toLocaleString('en-IN'), s: 'lifetime', i: 'timer-outline' as const, c: colors.violet },
              { l: 'Pending approvals', v: `${kpis.pending}`, s: 'awaiting review', i: 'document-attach-outline' as const, c: colors.warning },
            ].map((k) => (
              <Card key={k.l} style={{ flexGrow: 1, flexBasis: isMobile ? '45%' : 180, gap: 9 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${k.c}1A`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={k.i} size={18} color={k.c} />
                </View>
                <Txt size={24} weight="800" display>
                  {k.v}
                </Txt>
                <Txt size={12.5} weight="700" color={colors.textMuted}>
                  {k.l}
                </Txt>
                <Txt size={11.5} color={colors.textFaint}>
                  {k.s}
                </Txt>
              </Card>
            ))}
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <Card style={{ flex: 1.3 }}>
              <SectionHeader title="Weekly platform activity" icon="bar-chart-outline" action="minutes studied" />
              <BarChart data={weekly} color={colors.blue} />
            </Card>
            <Card style={{ flex: 1 }}>
              <SectionHeader title="Learners by exam" icon="pie-chart-outline" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <Donut
                  segments={examSplit}
                  center={
                    <>
                      <Txt size={20} weight="800" display>
                        {state.learners.length}
                      </Txt>
                      <Txt size={11} color={colors.textMuted}>
                        learners
                      </Txt>
                    </>
                  }
                />
                <View style={{ flex: 1 }}>
                  <SvgLegend items={examSplit.map((e) => ({ label: e.label, color: e.color, value: `${e.value}` }))} />
                </View>
              </View>
            </Card>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            <Card style={{ flex: 1 }}>
              <SectionHeader title="Catalogue coverage" icon="layers-outline" />
              <HBar label="Library resources" value={RESOURCES.length} total={20} color={colors.blue} />
              <HBar label="PYQ bank" value={PYQS.length} total={30} color={colors.teal} />
              <HBar label="Mock tests" value={TESTS.length} total={10} color={colors.violet} />
              <HBar label="Approved submissions" value={state.queue.filter((q) => q.status === 'approved').length} total={state.queue.length} color={colors.success} />
            </Card>
            <Card style={{ flex: 1 }}>
              <SectionHeader title="Top performers" icon="trophy-outline" />
              <View style={{ gap: 12 }}>
                {[...state.learners]
                  .sort((a, b) => b.avgScore - a.avgScore)
                  .slice(0, 5)
                  .map((l, i) => (
                    <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                      <Txt size={13} weight="800" color={colors.textFaint} style={{ width: 18 }}>
                        {i + 1}
                      </Txt>
                      <Avatar name={l.name} size={32} />
                      <View style={{ flex: 1 }}>
                        <Txt size={13} weight="700" numberOfLines={1}>
                          {l.name}
                        </Txt>
                        <Txt size={11.5} color={colors.textFaint}>
                          {l.exam.toUpperCase()} · {l.tests} tests
                        </Txt>
                      </View>
                      <Tag label={`${l.avgScore}%`} color={colors.success} />
                    </View>
                  ))}
              </View>
            </Card>
          </View>
        </View>
      ) : null}

      {tab === 'learners' ? (
        <View style={{ gap: 14 }}>
          <Field value={search} onChangeText={setSearch} placeholder="Search learners by name, email or exam…" icon="search-outline" returnKeyType="search" />
          {learners.map((l) => (
            <Card key={l.id}>
              <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 14, alignItems: isMobile ? 'flex-start' : 'center' }}>
                <Avatar name={l.name} size={44} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Txt size={14.5} weight="800">
                      {l.name}
                    </Txt>
                    <Tag label={l.plan} color={l.plan === 'Elite' ? colors.violet : l.plan === 'Pro' ? colors.blue : colors.textMuted} />
                    <Tag label={l.status === 'active' ? 'Active' : 'Suspended'} color={l.status === 'active' ? colors.success : colors.danger} />
                  </View>
                  <Txt size={12} color={colors.textMuted}>
                    {l.email} · joined {l.joined}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                    {[
                      ['Exam', l.exam.toUpperCase()],
                      ['Streak', `${l.streak}d`],
                      ['Tests', `${l.tests}`],
                      ['Avg', `${l.avgScore}%`],
                    ].map(([k, v]) => (
                      <View key={k}>
                        <Txt size={11} color={colors.textFaint}>
                          {k}
                        </Txt>
                        <Txt size={13} weight="800">
                          {v}
                        </Txt>
                      </View>
                    ))}
                  </View>
                </View>
                <Button
                  label={l.status === 'active' ? 'Suspend' : 'Activate'}
                  icon={l.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'}
                  size="sm"
                  variant={l.status === 'active' ? 'outline' : 'primary'}
                  onPress={() => dispatch({ type: 'learnerStatus', id: l.id, status: l.status === 'active' ? 'suspended' : 'active' })}
                />
              </View>
            </Card>
          ))}
          {!learners.length ? <EmptyState icon="people-outline" title="No learners found" body="Try a different name, email or exam keyword." /> : null}
        </View>
      ) : null}

      {tab === 'content' ? (
        <View style={{ gap: 14 }}>
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Ionicons name="information-circle-outline" size={20} color={colors.blue} />
            <Txt size={13} color={colors.textMuted} style={{ flex: 1 }}>
              {state.queue.filter((q) => q.status === 'pending').length} submission(s) awaiting review. Approved content is published to the learner library immediately.
            </Txt>
          </Card>
          {state.queue.map((c) => (
            <Card key={c.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Tag label={c.type} color={colors.blue} />
                <Tag label={EXAMS.find((e) => e.id === c.exam)?.short ?? ''} color={colors.teal} />
                <Tag
                  label={c.status === 'pending' ? 'Pending' : c.status === 'approved' ? 'Approved' : 'Rejected'}
                  color={c.status === 'pending' ? colors.warning : c.status === 'approved' ? colors.success : colors.danger}
                />
                <Txt size={11.5} color={colors.textFaint} style={{ marginLeft: 'auto' }}>
                  submitted {c.submitted}
                </Txt>
              </View>
              <Txt size={15} weight="800" display>
                {c.title}
              </Txt>
              <Txt size={12.5} color={colors.textMuted}>
                by {c.author}
              </Txt>
              {c.status === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button label="Approve" icon="checkmark" size="sm" onPress={() => dispatch({ type: 'reviewContent', id: c.id, status: 'approved' })} />
                  <Button label="Reject" icon="close" size="sm" variant="outline" onPress={() => dispatch({ type: 'reviewContent', id: c.id, status: 'rejected' })} />
                </View>
              ) : (
                <Button label="Move back to pending" size="sm" variant="ghost" onPress={() => dispatch({ type: 'reviewContent', id: c.id, status: 'pending' as any })} />
              )}
            </Card>
          ))}
        </View>
      ) : null}

      {tab === 'announce' ? (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
          <Card style={{ flex: 1, gap: 14 }}>
            <SectionHeader title="Publish announcement" icon="megaphone-outline" />
            <Field label="Title" value={title} onChangeText={setTitle} placeholder="E.g. Prelims Countdown Series begins Monday" icon="text-outline" />
            <Field label="Message" value={body} onChangeText={setBody} placeholder="What should learners know?" multiline minHeight={130} />
            <View>
              <Txt size={12.5} weight="700" color={colors.textMuted} style={{ marginBottom: 9 }}>
                Audience
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['All learners', 'UPSC aspirants', 'SSC aspirants', 'Banking aspirants', 'Elite plan'].map((a) => (
                  <Chip key={a} label={a} active={audience === a} onPress={() => setAudience(a)} />
                ))}
              </View>
            </View>
            <Button
              label={published ? 'Published' : 'Publish announcement'}
              icon={published ? 'checkmark-done' : 'send-outline'}
              full
              onPress={() => {
                if (!title.trim() || !body.trim()) return;
                const item = { id: `a-${Date.now()}`, title: title.trim(), body: body.trim(), audience, at: Date.now() };
                dispatch({ type: 'announce', item });
                dispatch({
                  type: 'notify',
                  notif: { id: `n-${Date.now()}`, title: item.title, body: item.body, at: Date.now(), kind: 'announcement', read: false },
                });
                setTitle('');
                setBody('');
                setPublished(true);
                setTimeout(() => setPublished(false), 2200);
              }}
            />
          </Card>

          <Card style={{ flex: 1 }}>
            <SectionHeader title="Published" icon="time-outline" action="Inbox" onAction={() => nav.navigate('Notifications')} />
            <View style={{ gap: 14 }}>
              {state.announcements.map((a) => (
                <View key={a.id} style={{ padding: 13, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, gap: 6 }}>
                  <Txt size={14} weight="800">
                    {a.title}
                  </Txt>
                  <Txt size={12.5} color={colors.textMuted}>
                    {a.body}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Tag label={a.audience} color={colors.teal} />
                    <Txt size={11.5} color={colors.textFaint}>
                      {new Date(a.at).toLocaleString('en-IN')}
                    </Txt>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </View>
      ) : null}
    </Shell>
  );
}
