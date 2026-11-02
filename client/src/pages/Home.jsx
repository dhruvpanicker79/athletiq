import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Radio, Trophy, Zap, Target, CircleDot, Disc3 } from 'lucide-react';
import { api } from '../services/api';
import { useFetch, useCompetitions } from '../hooks/useFetch';
import { Async, Crest, DemoBadge, Empty, LiveDot, Section, Skeleton } from '../components/ui';
import { MatchCard, MatchList } from '../components/MatchCard';
import { scoreLabel } from '../utils/format';

const HERO = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=2000&q=70';
const SPORTS = [
  { slug: 'football', name: 'Football', icon: CircleDot, text: 'Premier League, La Liga, Champions League, ISL' },
  { slug: 'cricket', name: 'Cricket', icon: Target, text: 'IPL, ICC tournaments and international T20s' },
  { slug: 'basketball', name: 'Basketball', icon: Disc3, text: 'NBA and WNBA, quarter by quarter' },
];
const POPULAR = ['EPL', 'UCL', 'IPL', 'NBA'];

function Ticker({ matches }) {
  if (!matches.length) return null;
  const items = [...matches, ...matches];
  return (
    <div className="border-y border-line bg-bg2">
      <div className="container-x flex items-center gap-4 py-3">
        <span className="shrink-0"><LiveDot label="LIVE NOW" /></span>
        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
          <div className="animate-ticker flex w-max gap-8">
            {items.map((m, i) => (
              <Link key={i} to={`/match/${m._id}`} className="flex items-center gap-2.5 whitespace-nowrap text-sm hover:text-lime">
                <Crest item={m.homeTeamId} size={20} />
                <span className="font-semibold">{m.homeTeamId.shortName}</span>
                <span className="score text-base">{scoreLabel(m, 'home')} – {scoreLabel(m, 'away')}</span>
                <span className="font-semibold">{m.awayTeamId.shortName}</span>
                <Crest item={m.awayTeamId} size={20} />
                <span className="text-xs tabular-nums text-live">{m.clock}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const live = useFetch(() => api.matches.live({ limit: 12 }).then((r) => r.items), []);
  const upcoming = useFetch(() => api.matches.upcoming({ limit: 8 }).then((r) => r.items), []);
  const results = useFetch(() => api.matches.results({ limit: 6 }).then((r) => r.items), []);
  const comps = useCompetitions();
  const spotlight = live.data?.[0] || upcoming.data?.[0];
  const featured = [...(live.data || []), ...(upcoming.data || [])].slice(0, 3);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <img src={HERO} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#0D1010_10%,rgba(13,16,16,0.82)_50%,rgba(13,16,16,0.55)),linear-gradient(0deg,#0D1010,transparent_40%)]" />
        <div className="container-x grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-[1.25fr_1fr] lg:py-32">
          <div>
            <p className="eyebrow mb-5 flex items-center gap-3 text-lime"><span className="h-px w-8 bg-lime" />The game. The numbers. The moment.</p>
            <h1 className="font-display text-[64px] font-extrabold uppercase leading-[0.86] tracking-tight sm:text-[96px] lg:text-[118px]">
              Beyond the<br />Scoreboard<span className="text-lime">.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base text-ink/80 sm:text-lg">Follow every match, track your favourite teams and explore the statistics behind every performance.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/live" className="btn-lime px-6 py-3.5 text-[13px] uppercase tracking-wider">Explore live scores <ArrowRight size={16} /></Link>
              <a href="#sports" className="btn-ghost px-6 py-3.5 text-[13px] uppercase tracking-wider">Discover sports</a>
            </div>
          </div>

          {/* Match spotlight */}
          <div className="w-full max-w-md justify-self-end">
            {spotlight ? (
              <Link to={`/match/${spotlight._id}`} className="card block bg-card/80 p-6 backdrop-blur transition-colors hover:border-lime/40">
                <div className="mb-5 flex items-center justify-between">
                  <span className="eyebrow">{spotlight.competitionId?.name}</span>
                  {spotlight.status === 'LIVE' ? <LiveDot /> : <span className="text-xs font-bold text-lime">UP NEXT</span>}
                </div>
                {[['home', spotlight.homeTeamId], ['away', spotlight.awayTeamId]].map(([side, t]) => (
                  <div key={side} className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-3 text-lg font-semibold"><Crest item={t} size={40} />{t.name}</span>
                    <span className="score text-4xl">{spotlight.status === 'LIVE' ? scoreLabel(spotlight, side) : ''}</span>
                  </div>
                ))}
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs text-mute">
                  <span>{spotlight.venue}</span>
                  <span className="font-semibold tabular-nums text-lime">{spotlight.status === 'LIVE' ? spotlight.clock : new Date(spotlight.startTime).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </Link>
            ) : <Skeleton rows={1} h="h-56" />}
            <div className="mt-3 flex justify-end"><DemoBadge /></div>
          </div>
        </div>
      </section>

      {/* A. Live ticker */}
      <Ticker matches={live.data || []} />

      <div className="container-x space-y-20 pt-16">
        {/* B. Featured */}
        <Section title="Featured matches" icon={Zap} action={<Link to="/live" className="text-sm font-semibold text-lime hover:underline">All live scores</Link>}>
          {live.loading && upcoming.loading ? <div className="grid gap-4 md:grid-cols-3"><Skeleton rows={1} h="h-56" /><Skeleton rows={1} h="h-56" /><Skeleton rows={1} h="h-56" /></div>
            : featured.length ? <div className="grid gap-4 md:grid-cols-3">{featured.map((m) => <MatchCard key={m._id} match={m} />)}</div>
              : <Empty title="No featured matches" text="Check back soon for upcoming fixtures." />}
        </Section>

        {/* C. Sports */}
        <Section title="Sports" icon={Trophy} className="scroll-mt-24">
          <div id="sports" className="grid gap-4 md:grid-cols-3">
            {SPORTS.map(({ slug, name, icon: Icon, text }) => (
              <Link key={slug} to={`/live?sport=${slug}`} className="card group relative overflow-hidden p-6 transition-colors hover:border-lime/50">
                <Icon size={30} className="text-lime" />
                <h3 className="mt-10 font-display text-4xl font-bold uppercase">{name}</h3>
                <p className="mt-1 text-sm text-mute">{text}</p>
                <ArrowRight className="absolute right-6 top-6 text-mute transition-transform group-hover:translate-x-1 group-hover:text-lime" />
              </Link>
            ))}
          </div>
        </Section>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* D. Results */}
          <Section title="Latest results" icon={CheckCircle2} action={<Link to="/results" className="text-sm font-semibold text-lime hover:underline">All results</Link>}>
            <Async state={results}>{(d) => <MatchList matches={d} showComp={false} />}</Async>
          </Section>
          {/* E. Fixtures */}
          <Section title="Upcoming fixtures" icon={CalendarDays} action={<Link to="/fixtures" className="text-sm font-semibold text-lime hover:underline">All fixtures</Link>}>
            <Async state={{ ...upcoming, data: upcoming.data?.slice(0, 6) }}>{(d) => <MatchList matches={d} showComp={false} />}</Async>
          </Section>
        </div>

        {/* F. Popular competitions */}
        <Section title="Popular competitions" icon={Radio} action={<Link to="/competitions" className="text-sm font-semibold text-lime hover:underline">All competitions</Link>}>
          <Async state={{ ...comps, data: comps.data?.filter((c) => POPULAR.includes(c.shortName)) }} skeleton={<Skeleton rows={1} h="h-32" />}>
            {(d) => (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {d.map((c) => (
                  <Link key={c._id} to={`/competitions/${c._id}`} className="card p-5 transition-colors hover:border-lime/50">
                    <Crest item={c} size={48} />
                    <h3 className="mt-5 font-display text-xl font-bold uppercase leading-tight">{c.name}</h3>
                    <p className="mt-1 text-xs text-mute">{c.sportId?.name} · {c.season}</p>
                  </Link>
                ))}
              </div>
            )}
          </Async>
        </Section>
      </div>
    </>
  );
}
