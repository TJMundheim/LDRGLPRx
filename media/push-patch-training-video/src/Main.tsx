import React from 'react';
import { Clip, ClipSpec } from './components/Clip';
import { EndCard, StepCard, TitleCard } from './components/Cards';
import { Pills, Split } from './components/Split';
import { Hi, Segment } from './components/ui';
import { Dropper } from './illustrations/Dropper';
import { Kit, KIT_ITEMS } from './illustrations/Kit';
import { Arm, Calendar, Clock, GoodToKnow, PadTop, Removal, VialRock } from './illustrations/Scenes';
import { SHOT } from './clips';
import { sceneLen, wf } from './timing';
import { Scene } from './Video';
import { FPS } from './theme';

export const clip = (from: number, spec: ClipSpec): Segment => ({ from, render: (w, h, d) => <Clip spec={spec} w={w} h={h} durationInFrames={d} /> });
const STEP_DUR = Math.round(2.9 * FPS);
const step = (n: number): Scene => ({ id: `step${n}`, dur: STEP_DUR, el: <StepCard step={n} />, fadeIn: 8, fadeOut: 8 });

const K1 = 'Step 1 · Mix your blend';
const K2 = 'Step 2 · Load the patch';
const K3 = 'Step 3 · Prepare your skin';
const K4 = 'Step 4 · Apply and seal';
const K5 = 'Step 5 · Wear for 12 hours';

export const mainScenes = (): Scene[] => {
  const s: Scene[] = [];
  s.push({ id: 's01-title', dur: Math.round(5.2 * FPS), el: <TitleCard title={'How to apply your Push\u00a0Patch'} sub="5 steps · about 10 minutes" />, fadeIn: 1 });

  {
    const id = 's02-welcome', dur = sceneLen(id);
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} kicker="Before you start" headline="Set aside about 10 minutes." sub="Somewhere clean and well lit."
        segments={[clip(0, SHOT.kitOpen), clip(wf(id, 'set aside') - 4, SHOT.vialFull)]} />
    ) });
  }
  {
    const id = 's03-kit', dur = sceneLen(id);
    const at = KIT_ITEMS.map((it) => wf(id, it.word) - 3);
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} kicker="Before you start" headline="What's in your kit"
        segments={[{ from: 0, render: (w, h) => <Kit w={w} h={h} base={0} at={at} /> }]} />
    ) });
  }
  s.push(step(1));
  {
    const id = 's05-water', dur = sceneLen(id);
    const bB = wf(id, 'the markings'), bC = wf(id, 'the full line') - 8;
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} step={1} kicker={K1} headline={<>Squeeze from full down to the 2&nbsp;mL line <Hi>=&nbsp;1.5&nbsp;mL.</Hi></>} sub="The rest isn't used."
        segments={[
          { from: 0, render: (w, h) => <Dropper w={w} h={h} base={0} ev={{ capacityAt: wf(id, 'holds'), needAt: wf(id, 'you only need') }} /> },
          clip(bB, SHOT.markedDropper),
          { from: bC, render: (w, h) => <Dropper w={w} h={h} base={bC} ev={{ linesAt: wf(id, 'the full line'), line2At: wf(id, 'the 2 mL line'), tipOffAt: wf(id, 'remove the tip'), drainFrom: wf(id, 'slowly squeeze'), drainTo: wf(id, '2 mL line', 1) + 18, bracketAt: wf(id, "that's"), restAt: wf(id, 'the rest') }} /> },
        ]} />
    ) });
  }
  {
    const id = 's06-mix', dur = sceneLen(id);
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} step={1} kicker={K1} headline={<>Mix gently. <Hi>Don&apos;t shake.</Hi></>} sub="Tip it back and forth until the powder is fully dissolved."
        segments={[
          { from: 0, render: (w, h) => <VialRock w={w} h={h} base={0} capAt={6} rockAt={wf(id, 'tipping')} dontAt={wf(id, "don't shake")} /> },
          clip(wf(id, 'these are') - 4, SHOT.mix),
        ]} />
    ) });
  }
  s.push(step(2));
  {
    const id = 's08-load', dur = sceneLen(id);
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} step={2} kicker={K2} headline={<>Slowly. <Hi>Center of the pad.</Hi></>} sub="Some blends turn the pad blue. That's normal."
        segments={[
          { from: 0, render: (w, h) => <PadTop w={w} h={h} base={0} upAt={wf(id, 'white pad')} dripFrom={wf(id, 'slowly drip') + 6} dripTo={wf(id, 'go slowly') + 10} ringAt={wf(id, 'center of the pad')} /> },
          clip(wf(id, 'go slowly') - 4, SHOT.drip1),
          clip(wf(id, 'you want it all') - 4, SHOT.drip2),
          clip(wf(id, 'some blends') - 4, SHOT.drip3),
        ]} />
    ) });
  }
  s.push(step(3));
  {
    const id = 's10-skin', dur = sceneLen(id);
    const skipF = wf(id, "don't roll") - 4;
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} step={3} kicker={K3} headline={<>Clean · Flat · <span style={{ whiteSpace: 'nowrap' }}>Hair-free</span> · <span style={{ whiteSpace: 'nowrap' }}>Not over a joint</span></>}
        extra={<Pills items={['Alcohol pad', 'Roller', 'Skin-prep wipe']} at={[wf(id, 'wipe the area'), wf(id, 'then roll'), wf(id, 'finish')]} />}
        segments={[
          { from: 0, render: (w, h) => <Arm w={w} h={h} base={0} jointsAt={wf(id, 'cross a joint')} zoneAt={wf(id, 'back of the upper arm')} /> },
          clip(wf(id, 'wipe the area') - 4, SHOT.alcohol),
          clip(wf(id, 'then roll') - 4, SHOT.roller1),
          clip(wf(id, 'big enough') - 4, SHOT.roller2),
          clip(wf(id, 'mild redness') - 4, SHOT.redness),
          { from: skipF, render: (w, h) => <Arm w={w} h={h} base={skipF} jointsAt={-1000} zoneAt={-1000} skipAt={skipF + 8} /> },
          clip(wf(id, 'finish') - 4, SHOT.prep),
        ]} />
    ) });
  }
  s.push(step(4));
  {
    const id = 's12-apply', dur = sceneLen(id);
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} step={4} kicker={K4} headline={<>Seal every edge. <Hi>Pull the tab.</Hi></>} sub="Peel, place, and press all the way around."
        segments={[
          clip(0, SHOT.peel),
          clip(wf(id, 'right over') - 4, SHOT.place),
          clip(wf(id, 'press the edges') - 4, SHOT.press),
          clip(wf(id, 'then pull') - 4, SHOT.pullTab),
          clip(wf(id, 'that starts') - 4, SHOT.sealed),
        ]} />
    ) });
  }
  s.push(step(5));
  {
    const id = 's14-wear', dur = sceneLen(id);
    const bB = wf(id, 'to take it off') - 4, bC = wf(id, 'one patch') - 6;
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} step={5} kicker={K5} headline={<>12 hours · Remove wet<br /><Hi>Once a week × 6</Hi></>} sub="Never pull it off dry."
        segments={[
          { from: 0, render: (w, h) => <Clock w={w} h={h} base={0} fillFrom={wf(id, '12 hours') - 2} fillTo={wf(id, '12 hours') + 70} /> },
          { from: bB, render: (w, h) => <Removal w={w} h={h} base={bB} at={[bB + 6, wf(id, 'peel slowly'), wf(id, 'never pull'), wf(id, 'wait at least')]} /> },
          { from: bC, render: (w, h) => <Calendar w={w} h={h} base={bC} from={bC + 10} /> },
        ]} />
    ) });
  }
  {
    const id = 's15-good', dur = sceneLen(id);
    s.push({ id, dur, audio: id, el: (
      <Split dur={dur} kicker="Good to know" headline={<>Store below 77°F, <Hi>dry.</Hi></>} sub="Irritation? Remove the patch and contact us."
        segments={[{ from: 0, render: (w, h) => <GoodToKnow w={w} h={h} base={0} at={[wf(id, 'store'), wf(id, 'if your skin')]} /> }]} />
    ) });
  }
  {
    const id = 's16-end', dur = sceneLen(id, 3.2);
    s.push({ id, dur, audio: id, el: <EndCard />, fadeOut: 2 });
  }
  return s;
};
