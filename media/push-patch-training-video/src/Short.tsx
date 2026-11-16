import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { EndCard, TitleCard } from './components/Cards';
import { Split } from './components/Split';
import { Background, Hi, SceneFade } from './components/ui';
import { Dropper } from './illustrations/Dropper';
import { Clock, VialRock } from './illustrations/Scenes';
import { SHOT } from './clips';
import { clip } from './Main';
import { sceneLen, wf } from './timing';
import { Scene } from './Video';

const T = 0.35; // tighter tails for the ~30 s cut

export const shortScenes = (): Scene[] => {
  const s: Scene[] = [];
  {
    const id = 't1-title', dur = sceneLen(id, 0.5);
    s.push({ id, dur, audio: id, captions: false, fadeIn: 1, el: <TitleCard title={'Your Push\u00a0Patch in 5\u00a0steps'} /> });
  }
  {
    const id = 't2-water', dur = sceneLen(id, T);
    const mixF = wf(id, 'mix gently') - 4;
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} step={1} kicker="Step 1 · Mix" headline={<>Full line → 2&nbsp;mL line <Hi>=&nbsp;1.5&nbsp;mL</Hi></>} sub="Mix gently. Don't shake."
        segments={[
          { from: 0, render: (w, h) => <Dropper w={w} h={h} base={0} ev={{ linesAt: -100, line2At: -100, tipOffAt: -100, drainFrom: wf(id, 'squeeze'), drainTo: wf(id, '2 mL line') + 14, bracketAt: wf(id, "that's") }} /> },
          { from: mixF, render: (w, h) => <VialRock w={w} h={h} base={mixF} capAt={mixF - 30} rockAt={mixF + 2} dontAt={1e9} /> },
        ]} />
    ) });
  }
  {
    const id = 't3-drip', dur = sceneLen(id, T);
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} step={2} kicker="Step 2 · Load" headline={<>Drip slowly onto the <Hi>center of the pad.</Hi></>}
        segments={[clip(0, { ...SHOT.drip1, at: 2.5 })]} />
    ) });
  }
  {
    const id = 't4-skin', dur = sceneLen(id, T);
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} step={3} kicker="Step 3 · Prepare" headline={<>Clean, roll gently, <Hi>wipe.</Hi></>}
        segments={[clip(0, SHOT.alcohol), clip(wf(id, 'roll gently') - 4, { ...SHOT.roller1, at: 1.6 }), clip(wf(id, 'and wipe') - 4, { ...SHOT.prep, at: 1.0 })]} />
    ) });
  }
  {
    const id = 't5-seal', dur = sceneLen(id, T);
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} step={4} kicker="Step 4 · Apply" headline={<>Seal every edge. <Hi>Pull the tab.</Hi></>}
        segments={[clip(0, SHOT.place), clip(wf(id, 'seal') - 4, { ...SHOT.press, at: 7.5 }), clip(wf(id, 'pull') - 4, SHOT.pullTab)]} />
    ) });
  }
  {
    const id = 't6-end', dur = sceneLen(id, 1.6);
    const endF = wf(id, 'questions') - 6;
    s.push({ id, dur, audio: id, fadeOut: 2, el: (
      <>
        <Split dur={dur} step={5} kicker="Step 5 · Wear" headline={<>Wear it <Hi>12 hours.</Hi></>}
          segments={[{ from: 0, render: (w, h) => <Clock w={w} h={h} base={0} fillFrom={wf(id, 'wear it')} fillTo={wf(id, 'wear it') + 40} /> }]} />
        <Sequence from={endF} layout="none">
          <AbsoluteFill>
            <SceneFade dur={dur - endF} inF={10} outF={1}>
              <Background />
              <EndCard reorder={false} />
            </SceneFade>
          </AbsoluteFill>
        </Sequence>
      </>
    ) });
  }
  return s;
};
